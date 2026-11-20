// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import https from "https";
import querystring from "querystring";
import { createRequire } from "module";

// ── Spy on built-in modules ───────────────────────────────────────────────────
// vi.mock() doesn't intercept CJS require() calls reliably in Node environment.
// vi.spyOn replaces the property on the shared module object, which the CJS
// require() cache also points to — so index.js's https.request call hits the spy.
const mockRequest = vi.spyOn(https, "request");
vi.spyOn(querystring, "stringify").mockImplementation((o) => new URLSearchParams(o).toString());

// Import once at module level (no resetModules — would break spies). Each test
// gets a fresh handler so the per-instance rate limits start empty.
const { createHandler } = await import("./index.js");
/** @type {(context: any, req: any) => Promise<void>} */
let handler;
// Inside the window validate.js accepts for the 2099 dates below.
const NOW = Date.parse("2099-06-01T12:00:00Z");

// The same CommonJS instances index.js requires, so a spy on getDatabase reaches it.
const require = createRequire(import.meta.url);
const cosmos = require("../shared/cosmos.js");
const { createFakeCosmos } = require("../shared/fakeCosmos.js");
const turnstile = require("../shared/turnstile.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Make https.request return the given status + body for the next call. */
function stubHttps(statusCode, body) {
  mockRequest.mockImplementationOnce((_opts, cb) => {
    const res = { statusCode, on: vi.fn() };
    res.on.mockImplementation((event, fn) => {
      if (event === "data") fn(typeof body === "string" ? body : JSON.stringify(body));
      if (event === "end") fn();
    });
    cb(res);
    return { on: vi.fn(), write: vi.fn(), end: vi.fn() };
  });
}

const makeContext = () => ({
  res: null,
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
});

const GOOD_TOKEN = "good-token";

const validBody = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  meetingType: "discovery",
  preferredDate: "2099-06-15",
  preferredTime: "09:00 AM",
  timezone: "UTC",
  message: "",
  phone: "",
  turnstileToken: GOOD_TOKEN,
};

/** @type {Record<string, string | undefined>} */
let savedEnv;
/** The fake Cosmos `bookings` container every test's slot check reads. */
let bookings;
/** The fake Cosmos `locks` container holding slot locks. */
let locks;
beforeEach(() => {
  mockRequest.mockReset();
  handler = createHandler({ now: () => NOW });
  const db = createFakeCosmos();
  bookings = db.container("bookings");
  locks = db.container("locks");
  vi.spyOn(cosmos, "getDatabase").mockReturnValue(db);
  vi.spyOn(turnstile, "verifyTurnstile").mockImplementation(async (token) =>
    token === GOOD_TOKEN
      ? { ok: true }
      : { ok: false, status: 403, error: "The spam check failed. Please try again." },
  );
  savedEnv = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  };
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REFRESH_TOKEN;
  delete process.env.GOOGLE_CALENDAR_ID;
});

afterEach(() => {
  vi.mocked(cosmos.getDatabase).mockRestore();
  vi.mocked(turnstile.verifyTurnstile).mockRestore?.();
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("create-booking Azure Function", () => {
  it("returns 204 for OPTIONS preflight", async () => {
    const ctx = makeContext();
    await handler(ctx, { method: "OPTIONS", body: null, query: {} });
    expect(ctx.res.status).toBe(204);
  });

  it("returns 400 when required fields are missing", async () => {
    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: { name: "Ada" }, query: {} });
    expect(ctx.res.status).toBe(400);
  });

  it("returns 200 with null links when Google creds are not configured", async () => {
    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });
    const body = JSON.parse(ctx.res.body);
    expect(ctx.res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.meetLink).toBeNull();
    expect(body._phase).toBe("google_unconfigured");
  });

  it("returns the Meet link when the calendar insert response already has entry points", async () => {
    process.env.GOOGLE_CLIENT_ID = "fake-client";
    process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "fake-token";
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";

    stubHttps(200, { access_token: "tok" }); // OAuth
    stubHttps(200, {
      id: "evt1",
      htmlLink: "https://calendar.google.com/event?eid=evt1",
      conferenceData: {
        entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" }],
      },
    }); // calendar insert — link already present

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(200);
    const body = JSON.parse(ctx.res.body);
    expect(body.meetLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(mockRequest).toHaveBeenCalledTimes(2); // OAuth + insert, no poll needed
  });

  it("polls for the Meet link when the insert response is still pending", async () => {
    process.env.GOOGLE_CLIENT_ID = "fake-client";
    process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "fake-token";
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";

    stubHttps(200, { access_token: "tok" }); // OAuth
    stubHttps(200, {
      id: "evt2",
      htmlLink: "https://calendar.google.com/event?eid=evt2",
      conferenceData: { createRequest: { status: { statusCode: "pending" } } },
    }); // insert — Meet link not ready yet
    stubHttps(200, {
      id: "evt2",
      conferenceData: {
        entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/xyz-1234-abc" }],
      },
    }); // first poll GET — link now populated

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(200);
    const body = JSON.parse(ctx.res.body);
    expect(body.meetLink).toBe("https://meet.google.com/xyz-1234-abc");
    expect(mockRequest).toHaveBeenCalledTimes(3); // OAuth + insert + one poll
  });

  it("falls back to hangoutLink when entry points are absent", async () => {
    process.env.GOOGLE_CLIENT_ID = "fake-client";
    process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "fake-token";
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";

    stubHttps(200, { access_token: "tok" }); // OAuth
    stubHttps(200, {
      id: "evt3",
      htmlLink: "https://calendar.google.com/event?eid=evt3",
      hangoutLink: "https://meet.google.com/legacy-link",
    }); // insert — only hangoutLink present

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(200);
    const body = JSON.parse(ctx.res.body);
    expect(body.meetLink).toBe("https://meet.google.com/legacy-link");
  });

  // Regression: a dead GOOGLE_REFRESH_TOKEN silently disabled every calendar
  // invite from at least June to 2026-09-03. The booker was told a link was
  // coming within 24 hours and nothing anywhere said why one never existed.
  it("names the dead credential in the host notification when Google returns invalid_grant", async () => {
    process.env.GOOGLE_CLIENT_ID = "fake-client";
    process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "stale-token";
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";
    process.env.RESEND_API_KEY = "resend-key";
    process.env.RESEND_TO_EMAIL = "host@example.com";

    stubHttps(400, JSON.stringify({ error: "invalid_grant" })); // OAuth refusal
    stubHttps(200, { id: "email-1" }); // Resend host notification

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(200);
    const body = JSON.parse(ctx.res.body);
    expect(body.success).toBe(true);
    expect(body.meetLink).toBeNull();
    expect(body._phase).toMatch(/invalid_grant/);

    // The notification must carry the reason, not just an absent link.
    const emailCall = mockRequest.mock.calls.find(([opts]) => opts.hostname === "api.resend.com");
    expect(emailCall).toBeTruthy();
    const written = mockRequest.mock.results
      .flatMap((r) => r.value?.write?.mock?.calls ?? [])
      .map(([chunk]) => String(chunk))
      .join("");
    expect(written).toMatch(/invalid_grant/);
    expect(written).toMatch(/GOOGLE_REFRESH_TOKEN/);
    expect(written).toMatch(/Action needed/);
    expect(written).toMatch(/No meeting link was created/);

    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_TO_EMAIL;
  });
  it("sends branded, escaped host and booker emails with the Meet and calendar links", async () => {
    process.env.GOOGLE_CLIENT_ID = "fake-client";
    process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "fake-token";
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";
    process.env.RESEND_API_KEY = "resend-key";
    process.env.RESEND_TO_EMAIL = "host@example.com";

    stubHttps(200, { access_token: "tok" }); // OAuth
    stubHttps(200, {
      id: "evt9",
      htmlLink: "https://calendar.google.com/event?eid=evt9",
      hangoutLink: "https://meet.google.com/abc-defg-hij",
    }); // calendar insert
    stubHttps(200, { id: "email-host" }); // Resend host notification
    stubHttps(200, { id: "email-booker" }); // Resend booker confirmation

    const ctx = makeContext();
    await handler(ctx, {
      method: "POST",
      body: {
        ...validBody,
        name: "Ada <b>Lovelace</b>",
        timezone: "Africa/Accra",
        phone: "+233 20 000 0000",
        message: "Line one\n<script>x</script>",
      },
      query: {},
    });

    const emails = mockRequest.mock.results
      .flatMap((r) => r.value?.write?.mock?.calls ?? [])
      .map(([chunk]) => String(chunk))
      .filter((chunk) => chunk.includes('"html"'))
      .map((chunk) => JSON.parse(chunk));
    expect(emails).toHaveLength(2);

    const host = emails.find((e) => e.to[0] === "host@example.com");
    const booker = emails.find((e) => e.to[0] === "ada@example.com");

    expect(host.from).toMatch(/^OceanicCoder Bookings </);
    expect(host.subject).toBe(
      "New Booking: Discovery Call with Ada <b>Lovelace</b> on 2099-06-15 at 09:00 AM",
    );
    expect(booker.from).toMatch(/^Illona Addae \(OceanicCoder\) </);
    expect(booker.subject).toBe("Your Google Meet is Confirmed for 2099-06-15 at 09:00 AM");

    for (const html of [host.html, booker.html]) {
      expect(html).toContain("Ysabeau Office");
      expect(html).toContain("Oceaniccoder-logo@3x.png");
      expect(html).toContain('href="https://meet.google.com/abc-defg-hij"');
      expect(html).toContain('href="https://calendar.google.com/event?eid=evt9"');
      expect(html).toContain("2099-06-15 at 09:00 AM");
      expect(html).toContain("Africa/Accra");
      expect(html).toContain("Discovery Call (30 min)");
      expect(html).toContain("Ada &lt;b&gt;Lovelace&lt;/b&gt;");
      expect(html).not.toContain("<b>Lovelace</b>");
    }

    expect(host.html).toContain("+233 20 000 0000");
    expect(host.html).toContain("Line one<br>&lt;script&gt;x&lt;/script&gt;");
    expect(host.html).not.toContain("<script>");
    expect(host.html).toContain('href="mailto:ada@example.com"');
    expect(host.html).toContain("View in Google Calendar");
    expect(host.html).not.toContain("No meeting link was created");
    expect(booker.html).toContain("Add to Google Calendar");
    expect(booker.html).toContain("Save this link.");

    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_TO_EMAIL;
  });
});

// The slot check reads the fake Cosmos `bookings` container from the top-level beforeEach.
describe("create-booking slot check on Cosmos", () => {
  const setGoogleEnv = () => {
    process.env.GOOGLE_CLIENT_ID = "fake-client";
    process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "fake-token";
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";
  };

  it("returns 409 before any invite or email when the slot is booked", async () => {
    setGoogleEnv();
    bookings.seed({ id: "b1", preferredDate: "2099-06-15", preferredTime: "09:00 AM" });

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(409);
    expect(JSON.parse(ctx.res.body).error).toBe("slot_taken");
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("proceeds when only other times or dates are booked", async () => {
    bookings.seed({ id: "b1", preferredDate: "2099-06-15", preferredTime: "10:00 AM" });
    bookings.seed({ id: "b2", preferredDate: "2099-06-16", preferredTime: "09:00 AM" });

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(200);
    expect(JSON.parse(ctx.res.body).success).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("queries with parameters, not values in the SQL", async () => {
    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(bookings.queries).toEqual([
      {
        query: "SELECT TOP 1 c.id FROM c WHERE c.preferredDate = @date AND c.preferredTime = @time",
        parameters: [
          { name: "@date", value: "2099-06-15" },
          { name: "@time", value: "09:00 AM" },
        ],
      },
    ]);
  });

  // Fails closed: an invite and a confirmation email for a slot that may be
  // taken are worse than asking the visitor to try again.
  it("answers 503, saves nothing and sends no invite or email when the check fails", async () => {
    setGoogleEnv();
    vi.spyOn(bookings.items, "query").mockImplementation(() => {
      throw new Error("Request rate is large");
    });

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(503);
    expect(JSON.parse(ctx.res.body).error).toBe("booking_failed");
    expect(mockRequest).not.toHaveBeenCalled();
    expect(ctx.log.error).toHaveBeenCalledWith("Booking save failed:", "Request rate is large");
    expect(bookings.docs.size).toBe(0);
    // The slot lock is released, so a retry can book the slot.
    expect(locks.docs.size).toBe(0);
  });

  describe("owner alert when the check fails", () => {
    beforeEach(() => {
      setGoogleEnv();
      process.env.RESEND_API_KEY = "resend-key";
      process.env.RESEND_TO_EMAIL = "host@example.com";
      vi.spyOn(bookings.items, "query").mockImplementation(() => {
        throw Object.assign(new Error("getaddrinfo ENOTFOUND oceaniccoder-db"), {
          code: "ENOTFOUND",
        });
      });
    });
    afterEach(() => {
      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_TO_EMAIL;
    });

    const run = async () => {
      const ctx = { res: null, log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } };
      await handler(ctx, { method: "POST", body: validBody, query: {} });
      return ctx;
    };

    it("emails the owner the date and time, and sends no invite or confirmation", async () => {
      stubHttps(200, { id: "email-alert" });

      const ctx = await run();

      expect(ctx.res.status).toBe(503);
      expect(JSON.parse(ctx.res.body)).toEqual({ error: "booking_failed" });
      // One request in all: the alert. No OAuth, no calendar insert, no booker email.
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest.mock.calls[0][0].hostname).toBe("api.resend.com");
      const sent = JSON.parse(mockRequest.mock.results[0].value.write.mock.calls[0][0]);
      expect(sent.to).toEqual(["host@example.com"]);
      expect(sent.subject).toBe(
        "Action needed: booking with Ada Lovelace on 2099-06-15 at 09:00 AM couldn't be saved",
      );
      expect(sent.html).toContain("The booking wasn");
      expect(sent.html).toContain("09:00 AM on 2099-06-15");
      expect(sent.html).toContain("contact them to rebook");
      expect(sent.html).not.toContain("Google credentials");
    });

    // @azure/cosmos reports a refused connection with an empty message.
    it("names the error code when the Cosmos error has no message", async () => {
      vi.mocked(bookings.items.query).mockImplementation(() => {
        throw Object.assign(new Error(""), { name: "RestError", code: "ECONNREFUSED" });
      });
      stubHttps(200, { id: "email-alert" });

      const ctx = await run();

      expect(ctx.res.status).toBe(503);
      expect(ctx.log.error).toHaveBeenCalledWith("Booking save failed:", "ECONNREFUSED");
      const sent = JSON.parse(mockRequest.mock.results[0].value.write.mock.calls[0][0]);
      expect(sent.html).toContain("on 2099-06-15 (ECONNREFUSED)");
    });

    // QA repro: Cosmos accepted the connection and never answered, so the
    // function hung past the browser's 10 s abort and never sent the alert.
    it("gives up after 5 s, cancels the query and alerts the owner that it timed out", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        vi.mocked(bookings.items.query).mockImplementation(() => ({
          fetchAll: () => new Promise(() => {}),
        }));
        stubHttps(200, { id: "email-alert" });

        const ctx = { res: null, log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } };
        const done = handler(ctx, { method: "POST", body: validBody, query: {} });
        await vi.advanceTimersByTimeAsync(4999);
        expect(ctx.res).toBeNull();
        await vi.advanceTimersByTimeAsync(1);
        await done;

        expect(ctx.res.status).toBe(503);
        expect(JSON.parse(ctx.res.body)).toEqual({ error: "booking_failed" });
        const { abortSignal } = vi.mocked(bookings.items.query).mock.calls[0][1];
        expect(abortSignal.aborted).toBe(true);
        expect(ctx.log.error).toHaveBeenCalledWith("Booking save failed:", "timed out");
        expect(mockRequest).toHaveBeenCalledTimes(1);
        expect(mockRequest.mock.calls[0][0].hostname).toBe("api.resend.com");
        const sent = JSON.parse(mockRequest.mock.results[0].value.write.mock.calls[0][0]);
        expect(sent.html).toContain("on 2099-06-15 (timed out)");
      } finally {
        vi.useRealTimers();
      }
    });

    it("still answers 503 when the alert itself can't be sent", async () => {
      mockRequest.mockImplementationOnce(() => {
        throw new Error("socket hang up");
      });

      const ctx = await run();

      expect(ctx.res.status).toBe(503);
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(ctx.log.error).toHaveBeenCalledWith("Notification error:", "socket hang up");
    });
  });
});

// /api/create-booking sends a calendar invite and emails from the owner's
// accounts to the address in the request, so nothing may be sent before the
// spam check passes and the booking row holds the slot.
describe("create-booking abuse protection", () => {
  const setGoogleEnv = () => {
    process.env.GOOGLE_CLIENT_ID = "fake-client";
    process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "fake-token";
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";
  };
  const post = async (body, headers = {}) => {
    const ctx = makeContext();
    await handler(ctx, { method: "POST", body, headers, query: {} });
    return ctx;
  };
  const stubMeetBooking = (id = "evt") => {
    stubHttps(200, { access_token: "tok" }); // OAuth
    stubHttps(200, {
      id,
      htmlLink: `https://calendar.google.com/event?eid=${id}`,
      hangoutLink: "https://meet.google.com/abc-defg-hij",
    }); // calendar insert
  };

  it("refuses a request without a Turnstile token before any Google, Zoom or Resend call", async () => {
    vi.mocked(turnstile.verifyTurnstile).mockRestore();
    const savedSecret = process.env.TURNSTILE_SECRET_KEY;
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    setGoogleEnv();
    process.env.RESEND_API_KEY = "resend-key";
    process.env.ZOOM_ACCOUNT_ID = "z";
    process.env.ZOOM_CLIENT_ID = "z";
    process.env.ZOOM_CLIENT_SECRET = "z";
    try {
      const { turnstileToken: _omit, ...noToken } = validBody;
      for (const body of [noToken, { ...noToken, preferredPlatform: "zoom" }]) {
        const ctx = await post(body);
        expect([400, 403]).toContain(ctx.res.status);
        expect(JSON.parse(ctx.res.body).error).toMatch(/spam check/i);
      }
      expect(mockRequest).not.toHaveBeenCalled();
      expect(bookings.docs.size).toBe(0);
    } finally {
      if (savedSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
      else process.env.TURNSTILE_SECRET_KEY = savedSecret;
      for (const k of ["RESEND_API_KEY", "ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"])
        delete process.env[k];
    }
  });

  it("refuses a failed Turnstile token with 403 and sends nothing", async () => {
    setGoogleEnv();
    const ctx = await post({ ...validBody, turnstileToken: "forged" });
    expect(ctx.res.status).toBe(403);
    expect(mockRequest).not.toHaveBeenCalled();
    expect(bookings.docs.size).toBe(0);
  });

  it("verifies the token with the visitor's IP, as Static Web Apps forwards it", async () => {
    stubMeetBooking();
    setGoogleEnv();
    await post(validBody, { "x-forwarded-for": "203.0.113.7:51234, [fd00::1]:443" });
    expect(turnstile.verifyTurnstile).toHaveBeenCalledWith(GOOD_TOKEN, "203.0.113.7");
  });

  it("lets only one of two simultaneous requests for a slot create an event", async () => {
    setGoogleEnv();
    stubMeetBooking("evt-race");

    const [a, b] = await Promise.all([post(validBody), post({ ...validBody, name: "Grace" })]);

    expect([a.res.status, b.res.status].sort()).toEqual([200, 409]);
    const inserts = mockRequest.mock.calls.filter(
      ([opts]) => opts.hostname === "www.googleapis.com" && opts.method === "POST",
    );
    expect(inserts).toHaveLength(1);
    expect(bookings.docs.size).toBe(1);
    expect(locks.docs.size).toBe(0);
  });

  it("saves the booking before the invite and stores the meeting links on it", async () => {
    setGoogleEnv();
    let rowsAtInsert = -1;
    mockRequest.mockImplementationOnce((_opts, cb) => {
      const res = { statusCode: 200, on: vi.fn() };
      res.on.mockImplementation((event, fn) => {
        if (event === "data") fn(JSON.stringify({ access_token: "tok" }));
        if (event === "end") fn();
      });
      rowsAtInsert = bookings.docs.size;
      cb(res);
      return { on: vi.fn(), write: vi.fn(), end: vi.fn() };
    });
    stubHttps(200, {
      id: "evt1",
      htmlLink: "https://calendar.google.com/event?eid=evt1",
      hangoutLink: "https://meet.google.com/abc-defg-hij",
    });

    const ctx = await post(validBody);

    expect(rowsAtInsert).toBe(1);
    const body = JSON.parse(ctx.res.body);
    expect(body.booking).toMatchObject({ status: "pending", email: "ada@example.com" });
    const [row] = [...bookings.docs.values()];
    expect(body.booking.$id).toBe(row.id);
    expect(row).toMatchObject({
      meetingLink: "https://meet.google.com/abc-defg-hij",
      calendarEventLink: "https://calendar.google.com/event?eid=evt1",
    });
  });

  it("keeps an admin decision made while the invite was going out", async () => {
    setGoogleEnv();
    stubMeetBooking();
    bookings.hooks.beforeReplace = async (id) => {
      bookings.hooks.beforeReplace = null;
      const row = bookings.docs.get(id);
      await bookings.item(id, id).replace({ ...row, status: "confirmed" });
    };

    const ctx = await post(validBody);

    expect(ctx.res.status).toBe(200);
    const [row] = [...bookings.docs.values()];
    expect(row).toMatchObject({
      status: "confirmed",
      meetingLink: "https://meet.google.com/abc-defg-hij",
    });
  });

  it("keeps the message and phone number out of the invite Google sends", async () => {
    setGoogleEnv();
    stubMeetBooking();
    await post({ ...validBody, phone: "+1 555 0100", message: "Pay your invoice now" });
    const insert = mockRequest.mock.results[1].value.write.mock.calls[0][0];
    expect(insert).not.toContain("Pay your invoice");
    expect(insert).not.toContain("555 0100");
  });

  it.each([
    ["a list of addresses", { email: "a@example.com, b@example.com" }],
    ["a display name", { email: "Ada <ada@example.com>" }],
    ["a link in the name", { name: "Pay at evil.example.com" }],
    ["an address in the name", { name: "write to x@evil.test" }],
    ["an unknown meeting type", { meetingType: "invoice" }],
    ["a time the form never offers", { preferredTime: "09:30 AM" }],
    ["an impossible date", { preferredDate: "2099-02-30" }],
    ["a date in the past", { preferredDate: "2099-05-01" }],
    ["a date years ahead", { preferredDate: "2101-06-15" }],
    ["an unknown timezone", { timezone: "Mars/Olympus" }],
    ["an unknown platform", { preferredPlatform: "teams" }],
    ["an over-long message", { message: "x".repeat(2001) }],
    ["an over-long name", { name: "x".repeat(101) }],
    ["a meeting link from the browser", { meetingLink: "https://meet.google.com/abc" }],
    ["an unknown field", { cc: "c@example.com" }],
  ])("refuses %s with 400 before the spam check", async (_label, change) => {
    setGoogleEnv();
    const ctx = await post({ ...validBody, ...change });
    expect(ctx.res.status).toBe(400);
    expect(turnstile.verifyTurnstile).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(bookings.docs.size).toBe(0);
  });

  it("limits one IP to 5 verified booking attempts an hour", async () => {
    const headers = { "x-forwarded-for": "203.0.113.9" };
    // Failed spam checks don't count, so they can't lock out a shared network.
    for (let i = 0; i < 10; i += 1) {
      expect((await post({ ...validBody, turnstileToken: "forged" }, headers)).res.status).toBe(
        403,
      );
    }
    const times = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM"];
    const statuses = [];
    for (const preferredTime of times) {
      statuses.push((await post({ ...validBody, preferredTime }, headers)).res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(bookings.docs.size).toBe(5);
    // Another IP is unaffected.
    const other = await post(
      { ...validBody, preferredTime: "03:00 PM" },
      { "x-forwarded-for": "198.51.100.4" },
    );
    expect(other.res.status).toBe(200);
  });

  it("saves bookings past the daily cap of 20 without an invite or emails", async () => {
    setGoogleEnv();
    for (let i = 0; i < 20; i += 1) stubMeetBooking(`evt${i}`);
    const results = [];
    for (let i = 0; i < 21; i += 1) {
      const day = String(10 + i).padStart(2, "0");
      const ctx = await post(
        { ...validBody, preferredDate: `2099-06-${day}` },
        { "x-forwarded-for": `203.0.113.${i + 1}` },
      );
      results.push(JSON.parse(ctx.res.body));
    }
    const calls = mockRequest.mock.calls.length;
    expect(calls).toBe(40); // OAuth + insert for each of the first 20
    expect(results[20]).toMatchObject({ success: true, meetLink: null, _phase: "invite_cap" });
    expect(bookings.docs.size).toBe(21);
  });
});
