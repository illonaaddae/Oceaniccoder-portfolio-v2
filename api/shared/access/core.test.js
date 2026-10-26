// @vitest-environment node
// The record-agnostic parts of createAccess: everything a scheme names comes
// from the scheme, and two schemes never accept each other's tokens. The
// quote rules themselves are tested in shared/quotes/access.test.js and pinned
// in access.golden.test.js.
import { describe, it, expect, vi } from "vitest";

const { createAccess } = await import("./core.js");
const { quoteAccess: quote } = await import("../quotes/accessScheme.js");
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

// Labels, cookies and pruned rows are unique per process, so every extra
// scheme a test builds takes names nobody else uses.
let freshCount = 0;
function fresh() {
  let n = (freshCount += 1);
  let tag = "";
  while (n > 0) {
    tag = String.fromCharCode(97 + (n % 26)) + tag;
    n = Math.floor(n / 26);
  }
  return { label: `l${tag}`, cookie: `c${tag}`, rows: `r${tag}` };
}
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

  it("refuses to prune rows the scheme shares but doesn't own, and leaves them alone", async () => {
    const sharer = createAccess({ ...DOC_SCHEME, ...fresh(), rows: "tr", prunes: false });
    expect(sharer.scheme.prunes).toBe(false);
    const clock = { ms: NOW };
    const locks = createFakeLocks({ now: () => clock.ms });
    await sharer.takeTry(locks, "cid");
    clock.ms += DAY;
    await expect(
      sharer.pruneAccessLocks({ locks, getScope: async () => DOC, nowMs: clock.ms }),
    ).rejects.toThrow(/doesn't own the "tr:" rows/);
    expect([...locks.held]).toEqual(["tr:try:cid:1"]);
  });

  it("needs getScope to return the scheme's own record shape", async () => {
    // Why: subject() is applied to what getScope returns. Here the scope
    // lookup hands back a quote-shaped record (revision, not rev), so the
    // live wrong-code counter reads as an older revision and is deleted.
    const run = async (scopeRecord) => {
      const clock = { ms: NOW };
      const locks = createFakeLocks({ now: () => clock.ms });
      await doc.recordMiss(locks, DOC, 0);
      clock.ms += DAY;
      await doc.pruneAccessLocks({ locks, getScope: async () => scopeRecord, nowMs: clock.ms });
      return locks.held.has("tr:miss:parent-1:1:0:1");
    };
    expect(await run(DOC)).toBe(true);
    expect(await run({ ...QUOTE, id: "parent-1" })).toBe(false);
  });
});

describe("scheme validation", () => {
  it("reads each scheme field once, so what is validated is what signs", () => {
    const names = fresh();
    let reads = 0;
    const scheme = { ...DOC_SCHEME, ...names };
    Object.defineProperty(scheme, "label", {
      enumerable: true,
      get() {
        reads += 1;
        // A first answer that passes, then the quote label afterwards.
        return reads === 1 ? names.label : "qa";
      },
    });
    const access = createAccess(scheme);
    expect(reads).toBe(1);
    expect(access.scheme.label).toBe(names.label);
  });

  it("refuses a label or cookie another scheme already uses", () => {
    expect(() => createAccess({ ...DOC_SCHEME, ...fresh(), label: "ta" })).toThrow(
      'createAccess: label "ta" is already used',
    );
    expect(() => createAccess({ ...DOC_SCHEME, ...fresh(), cookie: "tc" })).toThrow(
      'createAccess: cookie "tc" is already used',
    );
  });

  it("lets kinds share rows, but only one of them prune them", () => {
    expect(() => createAccess({ ...DOC_SCHEME, ...fresh(), rows: "tr" })).toThrow(
      'rows "tr" are already pruned by another scheme',
    );
    expect(() =>
      createAccess({ ...DOC_SCHEME, ...fresh(), rows: "tr", prunes: false }),
    ).not.toThrow();
  });

  it.each([
    ["label", "QA"],
    ["label", "q"],
    ["label", "q-a"],
    ["label", "abcdefghi"],
    ["rows", "q:a"],
    ["rows", ""],
    ["cookie", "q a"],
    ["cookie", undefined],
  ])("refuses a malformed %s (%j)", (field, value) => {
    expect(() => createAccess({ ...DOC_SCHEME, ...fresh(), [field]: value })).toThrow(
      `createAccess: ${field} must be 2 to 8 lowercase letters`,
    );
  });

  it.each(["subject", "locked", "unavailable", "gateVar", "logTag"])(
    "refuses a scheme without %s",
    (field) => {
      expect(() => createAccess({ ...DOC_SCHEME, ...fresh(), [field]: undefined })).toThrow(
        /^createAccess: /,
      );
    },
  );

  it("doesn't reserve the names of a scheme it refused", () => {
    const names = fresh();
    expect(() => createAccess({ ...DOC_SCHEME, ...names, subject: null })).toThrow();
    expect(() => createAccess({ ...DOC_SCHEME, ...names })).not.toThrow();
  });
});
