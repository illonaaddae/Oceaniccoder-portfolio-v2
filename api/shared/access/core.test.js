// @vitest-environment node
// The record-agnostic parts of createAccess: everything a scheme names comes
// from the scheme, and two schemes never accept each other's tokens. The
// quote rules themselves are tested in shared/quotes/access.test.js and pinned
// in access.golden.test.js.
import { describe, it, expect, vi } from "vitest";

const { createAccess } = await import("./core.js");
const { QUOTE_SCHEME } = await import("../quotes/accessScheme.js");
const { createFakeLocks } = await import("../quotes/fakes.js");

const SECRET = "s".repeat(40);
const NOW = Date.parse("2026-10-25T09:00:30.000Z");
const DAY = 24 * 3600 * 1000;

// A made-up kind whose scope differs from its id, as a document that shares
// its parent's epoch and counters would.
const DOC_SCHEME = {
  label: "ta",
  rows: "tr",
  cookie: "tc",
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
    logName: doc.ref,
  }),
};
const DOC = { ref: "same-id", rev: 1, email: "kofi@example.com", parent: "parent-1" };
const QUOTE = {
  id: "same-id",
  revision: 1,
  clientEmail: "kofi@example.com",
  tokenHash: "doc:same-id",
};

const doc = createAccess(DOC_SCHEME);
const quote = createAccess(QUOTE_SCHEME);
const cookieReq = (setCookie) => ({ headers: { cookie: setCookie.split(";")[0] } });
const caught = async (fn) => {
  try {
    await fn();
  } catch (err) {
    return { status: err.status, message: err.message, extra: err.extra };
  }
  return null;
};

describe("scheme names", () => {
  it("uses the scheme's gate variable, log tag and texts", async () => {
    const log = vi.fn();
    expect(doc.gateEnabled({ QUOTE_ACCESS_GATE: "off" })).toBe(true);
    expect(doc.gateEnabled({ TEST_ACCESS_GATE: "off" })).toBe(false);
    expect(await caught(() => doc.gateEnabled({ TEST_ACCESS_GATE: "x" }, log))).toEqual({
      status: 503,
      message: "Test links are unavailable.",
      extra: {},
    });
    expect(log).toHaveBeenCalledWith('test-access: TEST_ACCESS_GATE must be "on" or "off"');
    const locks = createFakeLocks();
    expect(
      await caught(() =>
        doc.requireAccess({
          env: { QUOTE_ACCESS_SECRET: SECRET },
          locks,
          req: { headers: {} },
          record: DOC,
          nowMs: NOW,
        }),
      ),
    ).toEqual({ status: 401, message: DOC_SCHEME.locked, extra: { locked: true } });
  });

  it("keys lock rows by the scheme's prefix and the subject's scope", async () => {
    const locks = createFakeLocks();
    await doc.bumpEpoch(locks, DOC);
    await doc.takeSendSlots(locks, DOC, 1, NOW);
    await doc.recordMiss(locks, DOC, 1);
    await doc.takeTry(locks, "cid");
    await doc.takeUse(locks, "cid");
    await doc.claimLinkCode(locks, "nonce");
    const keys = [...locks.held];
    expect(keys.every((key) => key.startsWith("tr:"))).toBe(true);
    expect(keys).toEqual(
      expect.arrayContaining([
        "tr:epoch:parent-1:1:1",
        "tr:miss:parent-1:1:1:1",
        "tr:try:cid:1",
        "tr:used:cid",
        "tr:lk:nonce",
      ]),
    );
    expect(keys.some((key) => key.startsWith("tr:send:parent-1:1:1:g:"))).toBe(true);
  });

  it("names the cookie by the scheme's prefix and label, over the subject id", () => {
    expect(doc.sessionCookieName("same-id")).toMatch(/^__Secure-oc_tc_[0-9a-f]{16}$/);
    expect(doc.sessionCookieName("same-id")).not.toBe(quote.sessionCookieName("same-id"));
    expect(doc.sessionCookie(SECRET, DOC, 0, NOW)).toMatch(
      /^__Secure-oc_tc_[0-9a-f]{16}=v1\.[^;]+; Max-Age=2592000; Path=\/api; HttpOnly; Secure; SameSite=Strict$/,
    );
  });
});

describe("isolation between schemes with the same secret and id", () => {
  it("a cookie from one never opens the other, even under the other's name", async () => {
    const locks = createFakeLocks();
    const quoteCookie = quote.sessionCookie(SECRET, QUOTE, 0, NOW);
    const docCookie = doc.sessionCookie(SECRET, DOC, 0, NOW);
    const value = (c) => c.split(";")[0].split("=").slice(1).join("=");
    const has = (access, record, req) =>
      access.hasAccess({ secret: SECRET, locks, req, record, nowMs: NOW + 1000 });
    expect(await has(quote, QUOTE, cookieReq(quoteCookie))).toBe(true);
    expect(await has(doc, DOC, cookieReq(docCookie))).toBe(true);
    expect(await has(doc, DOC, cookieReq(quoteCookie))).toBe(false);
    expect(await has(quote, QUOTE, cookieReq(docCookie))).toBe(false);
    // A quote cookie's value planted under the document's cookie name fails the label.
    const planted = `${doc.sessionCookieName("same-id")}=${value(quoteCookie)}`;
    expect(await has(doc, DOC, { headers: { cookie: planted } })).toBe(false);
  });

  it("a link code or challenge from one never checks out on the other", async () => {
    const locks = createFakeLocks();
    const linkCode = quote.mintLinkCode(SECRET, QUOTE, 0, NOW);
    expect(
      await quote.checkLinkCode({ secret: SECRET, locks, record: QUOTE, linkCode, nowMs: NOW }),
    ).toMatchObject({ ok: true });
    expect(
      await doc.checkLinkCode({ secret: SECRET, locks, record: DOC, linkCode, nowMs: NOW }),
    ).toEqual({ ok: false, reason: "invalid" });
    const { challenge, challengeId } = quote.issueChallenge(SECRET, QUOTE, 0, NOW);
    expect(
      await doc.checkChallenge({ secret: SECRET, locks, record: DOC, challenge, nowMs: NOW }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(doc.codeFor(SECRET, challengeId)).not.toBe(quote.codeFor(SECRET, challengeId));
  });

  it("a scope's epoch ends the unlocks of every record in it", async () => {
    const locks = createFakeLocks();
    const sibling = { ...DOC, ref: "other-id" };
    const cookie = doc.sessionCookie(SECRET, sibling, 0, NOW);
    const has = () =>
      doc.hasAccess({ secret: SECRET, locks, req: cookieReq(cookie), record: sibling, nowMs: NOW });
    expect(await has()).toBe(true);
    await doc.bumpEpoch(locks, DOC);
    expect(await has()).toBe(false);
  });
});

describe("pruneAccessLocks over a scheme", () => {
  it("only touches the scheme's rows and asks for the scope, not the id", async () => {
    const clock = { ms: NOW };
    const locks = createFakeLocks({ now: () => clock.ms });
    await doc.recordMiss(locks, DOC, 0);
    await doc.takeTry(locks, "cid");
    await quote.takeTry(locks, "cid");
    clock.ms += DAY;
    const getScope = vi.fn(async () => DOC);
    expect(await doc.pruneAccessLocks({ locks, getScope, nowMs: clock.ms })).toEqual({
      deleted: 1,
      kept: 1,
      skipped: 1,
    });
    expect(getScope).toHaveBeenCalledWith("parent-1");
    expect([...locks.held].sort()).toEqual(["qa:try:cid:1", "tr:miss:parent-1:1:0:1"]);
  });
});
