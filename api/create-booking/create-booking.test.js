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

// Import handler once at module level (no resetModules — would break spies).
const { default: handler } = await import("./index.js");

// The same CommonJS instances index.js requires, so a spy on getDatabase reaches it.
const require = createRequire(import.meta.url);
const cosmos = require("../shared/cosmos.js");
const { createFakeCosmos } = require("../shared/fakeCosmos.js");

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
  log: { error: vi.fn(), warn: vi.fn() },
});

const validBody = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  meetingType: "discovery",
  preferredDate: "2099-06-15",
  preferredTime: "09:00 AM",
  timezone: "UTC",
  message: "",
  phone: "",
};

/** @type {Record<string, string | undefined>} */
let savedEnv;
beforeEach(() => {
  mockRequest.mockReset();
  savedEnv = {
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  };
  delete process.env.APPWRITE_API_KEY;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REFRESH_TOKEN;
  delete process.env.GOOGLE_CALENDAR_ID;
});

afterEach(() => {
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

  it("skips Appwrite check and calls OAuth when APPWRITE_API_KEY is not set", async () => {
    process.env.GOOGLE_CLIENT_ID = "fake-client";
    process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "fake-token";
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";

    // OAuth token call fails → caught → 200 null. No Appwrite call expected.
    stubHttps(400, JSON.stringify({ error: "invalid_client" }));

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    // Only one https call: OAuth token (no Appwrite query).
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(ctx.res.status).toBe(200);
  });

  it("returns 409 when Appwrite reports the slot is already taken", async () => {
    process.env.APPWRITE_API_KEY = "test-api-key";
    stubHttps(200, { total: 1, documents: [] });

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(409);
    const body = JSON.parse(ctx.res.body);
    expect(body.error).toBe("slot_taken");
    expect(body.message).toMatch(/09:00 AM/);
  });

  it("returns 200 and proceeds when Appwrite reports slot is free (total: 0)", async () => {
    process.env.APPWRITE_API_KEY = "test-api-key";
    // Appwrite → free; no Google creds → early return with null links.
    stubHttps(200, { total: 0, documents: [] });

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(200);
    expect(JSON.parse(ctx.res.body).success).toBe(true);
  });

  it("proceeds (non-fatal) when Appwrite check returns a server error", async () => {
    process.env.APPWRITE_API_KEY = "test-api-key";
    // Appwrite 500 → isSlotTaken returns false → falls through to Google block.
    stubHttps(500, "Internal Server Error");

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(200);
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

describe("create-booking slot check on Cosmos", () => {
  let bookings;
  beforeEach(() => {
    process.env.DATA_BACKEND = "cosmos";
    const db = createFakeCosmos();
    bookings = db.container("bookings");
    vi.spyOn(cosmos, "getDatabase").mockReturnValue(db);
  });
  afterEach(() => {
    vi.mocked(cosmos.getDatabase).mockRestore();
    delete process.env.DATA_BACKEND;
  });

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

  it("proceeds when only other times or dates are booked, without asking Appwrite", async () => {
    process.env.APPWRITE_API_KEY = "test-api-key";
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
  // taken are worse than a booking saved (by /api/submit) without them.
  it("answers 503 and sends no invite or email when the check fails", async () => {
    setGoogleEnv();
    vi.spyOn(bookings.items, "query").mockImplementation(() => {
      throw new Error("Request rate is large");
    });

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(503);
    expect(JSON.parse(ctx.res.body).error).toBe("slot_check_failed");
    expect(mockRequest).not.toHaveBeenCalled();
    expect(ctx.log.error).toHaveBeenCalledWith("Slot check failed:", "Request rate is large");
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
      expect(JSON.parse(ctx.res.body)).toEqual({ error: "slot_check_failed" });
      // One request in all: the alert. No OAuth, no calendar insert, no booker email.
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest.mock.calls[0][0].hostname).toBe("api.resend.com");
      const sent = JSON.parse(mockRequest.mock.results[0].value.write.mock.calls[0][0]);
      expect(sent.to).toEqual(["host@example.com"]);
      expect(sent.subject).toBe(
        "Action needed: booking with Ada Lovelace on 2099-06-15 at 09:00 AM got no invite or confirmation",
      );
      expect(sent.html).toContain("No invite or confirmation was sent");
      expect(sent.html).toContain("09:00 AM on 2099-06-15");
      expect(sent.html).toContain("send the invite and confirmation by hand");
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
      expect(ctx.log.error).toHaveBeenCalledWith("Slot check failed:", "ECONNREFUSED");
      const sent = JSON.parse(mockRequest.mock.results[0].value.write.mock.calls[0][0]);
      expect(sent.html).toContain("was free (ECONNREFUSED)");
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
        expect(JSON.parse(ctx.res.body)).toEqual({ error: "slot_check_failed" });
        const { abortSignal } = vi.mocked(bookings.items.query).mock.calls[0][1];
        expect(abortSignal.aborted).toBe(true);
        expect(ctx.log.error).toHaveBeenCalledWith("Slot check failed:", "timed out");
        expect(mockRequest).toHaveBeenCalledTimes(1);
        expect(mockRequest.mock.calls[0][0].hostname).toBe("api.resend.com");
        const sent = JSON.parse(mockRequest.mock.results[0].value.write.mock.calls[0][0]);
        expect(sent.html).toContain("was free (timed out)");
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
