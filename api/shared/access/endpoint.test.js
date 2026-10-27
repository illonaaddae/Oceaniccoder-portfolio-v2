// @vitest-environment node
// createAccessEndpoint over a kind that isn't a quote: what the kind supplies
// (locator, emails, wording, log names, scheme) is what the endpoint uses.
// The full action matrix runs against quotes in api/quote-access.
import { createRequire } from "module";
import { describe, it, expect, vi } from "vitest";

const { createAccessEndpoint } = await import("./endpoint.js");
const { createAccess } = await import("./core.js");
// The same CommonJS instance endpoint.js requires, so instanceof holds.
const { HttpError } = createRequire(import.meta.url)("../http.js");
const { createFakeLocks } = await import("../quotes/fakes.js");

const SECRET = "s".repeat(40);
const START = Date.parse("2026-10-25T09:00:00.000Z");
const DOC = { ref: "D-7", rev: 0, email: "ama@gmail.com", parent: "D-7", number: "DOC-0007" };
const access = createAccess({
  label: "ea",
  rows: "er",
  cookie: "ec",
  gateVar: "TEST_ACCESS_GATE",
  logTag: "test-access",
  unavailable: "Test links are unavailable.",
  locked: "Enter the code to open this test document.",
  subject: (doc) => ({
    id: doc.ref,
    revision: doc.rev,
    linkId: `doc:${doc.ref}`,
    clientEmail: doc.email,
    scopeId: doc.parent,
    logName: doc.number,
  }),
});
const NOT_FOUND = () => new HttpError(404, "Not found.", { inactive: true });

function setup({
  env = { QUOTE_ACCESS_SECRET: SECRET, RESEND_TO_EMAIL: "owner@x.dev" },
  doc = DOC,
} = {}) {
  const locks = createFakeLocks();
  const lockCalls = vi.fn();
  const watched = new Proxy(locks, {
    get: (target, prop) => {
      const value = target[prop];
      if (typeof value !== "function") return value;
      return (...args) => {
        lockCalls(prop, ...args);
        return value.apply(target, args);
      };
    },
  });
  const docs = { "D-7": doc };
  const locator = {
    check: vi.fn((body) => {
      if (typeof body.ref !== "string") throw NOT_FOUND();
    }),
    find: vi.fn(async (svc, body) => {
      if (!docs[body.ref]) throw NOT_FOUND();
      return docs[body.ref];
    }),
    // Stands in for an unsigned link: anyone could type it.
    guessable: (body) => body.typed === true,
  };
  const mails = [];
  const logs = [];
  const clock = { ms: START };
  const handler = createAccessEndpoint({
    env,
    access,
    locator,
    emails: {
      code: (doc, code, minutes) => ({ subject: `${code} for ${doc.number} (${minutes})` }),
      lockedAlert: (doc, at, blocked) => ({ subject: `locked ${doc.number} ${blocked}` }),
    },
    // No log: the tag comes from the scheme's logTag.
    labels: {
      ref: "doc",
      noEmail: "No email on this document.",
      gateOff: "This document opens without a code.",
      blocked: "Codes are blocked on this document.",
    },
    send: async (mail) => {
      mails.push(mail);
      return { ok: true };
    },
    alertWaitMs: 50,
    services: () => ({ locks: watched, now: () => new Date(clock.ms) }),
  });
  const call = async (body) => {
    const log = Object.assign((...a) => logs.push(a.join(" ")), {
      error: (...a) => logs.push(`error ${a.join(" ")}`),
      warn: (...a) => logs.push(`warn ${a.join(" ")}`),
    });
    const context = { log };
    await handler(context, { method: "POST", body, headers: { "x-forwarded-for": "203.0.113.9" } });
    return {
      status: context.res.status,
      body: JSON.parse(context.res.body),
      cookie: context.res.headers["Set-Cookie"],
    };
  };
  return { call, mails, logs, locator, lockCalls, clock };
}

describe("createAccessEndpoint", () => {
  it("refuses a bad locator before the switch, the secret or any lock", async () => {
    const t = setup({ env: { TEST_ACCESS_GATE: "nonsense" } });
    const r = await t.call({ action: "send", ref: 7 });
    expect(r).toMatchObject({ status: 404, body: { error: "Not found.", inactive: true } });
    expect(t.lockCalls).not.toHaveBeenCalled();
    expect(t.locator.find).not.toHaveBeenCalled();
  });

  it("answers the kind's 404 for an unknown record without touching locks", async () => {
    const t = setup();
    const r = await t.call({ action: "status", ref: "D-404" });
    expect(r).toMatchObject({ status: 404, body: { error: "Not found.", inactive: true } });
    expect(t.lockCalls).not.toHaveBeenCalled();
  });

  it("reads the kind's own switch and wording", async () => {
    const t = setup({ env: { QUOTE_ACCESS_SECRET: SECRET, TEST_ACCESS_GATE: "off" } });
    expect((await t.call({ action: "status", ref: "D-7" })).body).toEqual({
      locked: false,
      gateOff: true,
    });
    expect(await t.call({ action: "send", ref: "D-7" })).toMatchObject({
      status: 409,
      body: { error: "This document opens without a code.", gateOff: true },
    });
  });

  it("sends the kind's code email to the subject's address and logs its number", async () => {
    const t = setup();
    const r = await t.call({ action: "send", ref: "D-7" });
    expect(r.status).toBe(200);
    expect(r.body.maskedEmail).toBe("a•••••@gmail.com");
    expect(t.mails).toHaveLength(1);
    expect(t.mails[0].to).toBe("ama@gmail.com");
    expect(t.mails[0].subject).toMatch(/^\d{6} for DOC-0007 \(10\)$/);
    expect(t.logs).toEqual(["test-access send doc=DOC-0007"]);
    const keys = t.lockCalls.mock.calls.map((call) => call[1]);
    expect(keys.every((key) => key.startsWith("er:"))).toBe(true);
  });

  it("verifies a code into the kind's cookie", async () => {
    const t = setup();
    const sent = await t.call({ action: "send", ref: "D-7" });
    const code = t.mails[0].subject.slice(0, 6);
    const r = await t.call({ action: "verify", ref: "D-7", challenge: sent.body.challenge, code });
    expect(r.status).toBe(200);
    expect(r.cookie).toMatch(/^__Secure-oc_ec_[0-9a-f]{16}=v1\./);
    expect(t.logs).toContain("test-access verify ok doc=DOC-0007");
  });

  it("claims a link code minted for the kind", async () => {
    const t = setup();
    const linkCode = access.mintLinkCode(SECRET, DOC, 0, START);
    const r = await t.call({ action: "claim", ref: "D-7", linkCode });
    expect(r.status).toBe(200);
    expect(r.cookie).toMatch(/^__Secure-oc_ec_/);
    expect((await t.call({ action: "claim", ref: "D-7", linkCode })).status).toBe(409);
    expect(t.logs).toEqual([
      "test-access claim ok doc=DOC-0007",
      "test-access claim refused doc=DOC-0007 reason=used",
    ]);
  });

  it("uses the kind's no-email wording", async () => {
    const t = setup({ doc: { ...DOC, email: "" } });
    expect(await t.call({ action: "send", ref: "D-7" })).toMatchObject({
      status: 409,
      body: { error: "No email on this document.", noEmail: true },
    });
  });

  describe("a guessable locator", () => {
    it("hides the address on status but still offers a code", async () => {
      const t = setup();
      expect((await t.call({ action: "status", ref: "D-7", typed: true })).body).toEqual({
        locked: true,
        canUnlock: true,
        blocked: false,
        maskedEmail: null,
      });
      expect((await t.call({ action: "status", ref: "D-7" })).body.maskedEmail).toBe(
        "a•••••@gmail.com",
      );
    });

    it("hides the address on send too, and still sends to the record's address", async () => {
      const t = setup();
      const r = await t.call({ action: "send", ref: "D-7", typed: true });
      expect(r.status).toBe(200);
      expect(r.body.maskedEmail).toBeNull();
      expect(r.body.retryAfterSeconds).toBe(15 * 60);
      expect(t.mails[0].to).toBe("ama@gmail.com");
    });

    it("can't unlock a record with no address", async () => {
      const t = setup({ doc: { ...DOC, email: "" } });
      expect((await t.call({ action: "status", ref: "D-7", typed: true })).body).toEqual({
        locked: true,
        canUnlock: false,
        blocked: false,
        maskedEmail: null,
      });
    });

    it("gets one code per 10 minutes and three a day", async () => {
      const t = setup();
      const send = async () => (await t.call({ action: "send", ref: "D-7", typed: true })).status;
      expect(await send()).toBe(200);
      t.clock.ms += 5 * 60 * 1000;
      expect(await send()).toBe(429);
      t.clock.ms += 10 * 60 * 1000;
      expect(await send()).toBe(200);
      t.clock.ms += 15 * 60 * 1000;
      expect(await send()).toBe(200);
      t.clock.ms += 15 * 60 * 1000;
      const fourth = await t.call({ action: "send", ref: "D-7", typed: true });
      expect(fourth.status).toBe(429);
      // The signed link still has the rest of the usual quota.
      expect((await t.call({ action: "send", ref: "D-7" })).status).toBe(200);
      expect(t.mails).toHaveLength(4);
    });
  });
});
