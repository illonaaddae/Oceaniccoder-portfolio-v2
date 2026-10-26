// @vitest-environment node
// The receipt kind of the access core: a receipt has its own labels and
// cookie, but its quote's epoch, quotas and wrong-code count.
import { describe, it, expect, vi } from "vitest";

const {
  RECEIPT_SCHEME,
  RECEIPT_NOT_FOUND,
  receiptSubject,
  receiptAccess,
  receiptLocator,
  receiptEmails,
} = await import("./access.js");
const { quoteAccess } = await import("../quotes/accessScheme.js");
const { createFakeRepo, createFakeLocks } = await import("../quotes/fakes.js");
const { signReceipt } = await import("../tokens.js");

const SECRET = "s".repeat(40);
const LINK_SECRET = "link-signing-secret";
const NOW = Date.parse("2026-10-26T09:00:00.000Z");
const REF = "Q-2026-0007-1-K7Q2X9PL";
const QUOTE = {
  id: "q7",
  quoteNumber: "Q-2026-0007",
  revision: 2,
  status: "accepted",
  title: "Online store",
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  tokenHash: "quote-token-hash",
};
const PAYMENT = {
  id: "p1",
  kind: "quote",
  status: "success",
  quoteId: "q7",
  quoteNumber: "Q-2026-0007",
  paystackReference: REF,
  // The payer typed another address at checkout; codes still go to the quote's.
  clientEmail: "payer@example.com",
};
const RECEIPT = { quote: QUOTE, payment: PAYMENT };

function setup({ payments = [PAYMENT], quotes = [QUOTE] } = {}) {
  const repo = createFakeRepo({ quotes, payments });
  repo.findPaymentByReference = vi.fn(repo.findPaymentByReference);
  const svc = { repo, now: () => new Date(NOW) };
  const locator = receiptLocator({ env: { RECEIPT_SIGNING_SECRET: LINK_SECRET } });
  const open = async (body) => {
    try {
      locator.check(body);
      return await locator.find(svc, body);
    } catch (err) {
      return { status: err.status, error: err.message, ...err.extra };
    }
  };
  return { open, repo, locator };
}

const sig = (reference) => signReceipt(reference, LINK_SECRET);
const NOT_FOUND = { status: 404, error: RECEIPT_NOT_FOUND, inactive: true };

describe("receiptSubject", () => {
  it("keys the receipt by its reference, and its counters by the quote", () => {
    expect(receiptSubject(QUOTE, PAYMENT)).toEqual({
      id: REF,
      revision: 2,
      linkId: `receipt:${REF}`,
      clientEmail: "kofi@example.com",
      scopeId: "q7",
      logName: REF,
    });
  });

  it("has its own labels and cookie, and shares the quote's rows without pruning them", () => {
    expect(RECEIPT_SCHEME).toMatchObject({
      label: "ra",
      rows: "qa",
      cookie: "ra",
      prunes: false,
      gateVar: "RECEIPT_ACCESS_GATE",
    });
    expect(receiptAccess.sessionCookieName(REF)).toMatch(/^__Secure-oc_ra_[0-9a-f]{16}$/);
  });

  it("shares the quote's epoch: New link on the quote ends a receipt unlock", async () => {
    const locks = createFakeLocks();
    const cookie = receiptAccess.sessionCookie(SECRET, RECEIPT, 0, NOW).split(";")[0];
    const has = () =>
      receiptAccess.hasAccess({
        secret: SECRET,
        locks,
        req: { headers: { cookie } },
        record: RECEIPT,
        nowMs: NOW,
      });
    expect(await has()).toBe(true);
    await quoteAccess.bumpEpoch(locks, QUOTE);
    expect(await receiptAccess.currentEpoch(locks, RECEIPT)).toBe(1);
    expect(await has()).toBe(false);
  });

  it("shares the quote's wrong-code count and send quotas", async () => {
    const locks = createFakeLocks();
    for (let i = 0; i < 14; i += 1) await quoteAccess.recordMiss(locks, QUOTE, 0);
    expect(await receiptAccess.recordMiss(locks, RECEIPT, 0)).toBe(15);
    expect(await quoteAccess.sendsBlocked(locks, QUOTE, 0)).toBe(true);
    expect(await receiptAccess.sendsBlocked(locks, RECEIPT, 0)).toBe(true);
    expect((await receiptAccess.takeSendSlots(locks, RECEIPT, 0, NOW)).ok).toBe(true);
    expect(await quoteAccess.takeSendSlots(locks, QUOTE, 0, NOW + 1000)).toEqual({
      ok: false,
      retryAfterSeconds: 89,
    });
  });

  it("refuses to prune the quote's rows", async () => {
    await expect(
      receiptAccess.pruneAccessLocks({
        locks: createFakeLocks(),
        getScope: async () => RECEIPT,
        nowMs: NOW,
      }),
    ).rejects.toThrow(/doesn't own the "qa:" rows/);
  });
});

describe("receiptLocator", () => {
  it("finds a successful quote payment and its quote", async () => {
    const found = await setup().open({ reference: REF, s: sig(REF) });
    expect(found.quote).toMatchObject({ id: "q7" });
    expect(found.payment).toMatchObject({ paystackReference: REF });
  });

  it.each([
    ["no reference", { s: sig(REF) }],
    ["a reference that isn't a string", { reference: 7, s: sig(REF) }],
    ["a reference over 80 characters", { reference: "R".repeat(81), s: sig("R".repeat(81)) }],
    ["no signature", { reference: REF }],
    ["a signature of the wrong length", { reference: REF, s: "short" }],
    ["a wrong signature", { reference: REF, s: sig("Q-2026-0007-1-OTHER") }],
  ])("refuses %s before any lookup", async (_name, body) => {
    const t = setup();
    expect(await t.open(body)).toEqual(NOT_FOUND);
    expect(t.repo.findPaymentByReference).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown reference", { payments: [] }],
    ["an invoice payment", { payments: [{ ...PAYMENT, kind: "invoice" }] }],
    ["a payment that didn't succeed", { payments: [{ ...PAYMENT, status: "pending" }] }],
    ["a payment whose quote is gone", { quotes: [] }],
  ])("answers the same 404 for %s", async (_name, data) => {
    expect(await setup(data).open({ reference: REF, s: sig(REF) })).toEqual(NOT_FOUND);
  });

  it("is never guessable: every receipt link is signed", () => {
    expect(setup().locator.guessable).toBeUndefined();
  });
});

describe("isolation from quotes", () => {
  const cookieReq = (setCookie) => ({ headers: { cookie: setCookie.split(";")[0] } });

  it("a quote cookie or link code never opens the receipt, nor the reverse", async () => {
    const locks = createFakeLocks();
    // A quote whose id is the receipt's reference, as a worst case.
    const twin = { ...QUOTE, id: REF, tokenHash: `receipt:${REF}` };
    const has = (access, record, cookie) =>
      access.hasAccess({ secret: SECRET, locks, req: cookieReq(cookie), record, nowMs: NOW });
    const quoteCookie = quoteAccess.sessionCookie(SECRET, twin, 0, NOW);
    const receiptCookie = receiptAccess.sessionCookie(SECRET, RECEIPT, 0, NOW);
    expect(await has(receiptAccess, RECEIPT, receiptCookie)).toBe(true);
    expect(await has(receiptAccess, RECEIPT, quoteCookie)).toBe(false);
    expect(await has(quoteAccess, twin, receiptCookie)).toBe(false);
    expect(await has(quoteAccess, QUOTE, receiptCookie)).toBe(false);
    const check = (access, record, linkCode) =>
      access.checkLinkCode({ secret: SECRET, locks, record, linkCode, nowMs: NOW });
    const quoteCode = quoteAccess.mintLinkCode(SECRET, twin, 0, NOW);
    const receiptCode = receiptAccess.mintLinkCode(SECRET, RECEIPT, 0, NOW);
    expect(await check(receiptAccess, RECEIPT, receiptCode)).toMatchObject({ ok: true });
    expect(await check(receiptAccess, RECEIPT, quoteCode)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await check(quoteAccess, twin, receiptCode)).toEqual({ ok: false, reason: "invalid" });
  });

  it("a receipt unlock opens only its own receipt", async () => {
    const locks = createFakeLocks();
    const other = { quote: QUOTE, payment: { ...PAYMENT, paystackReference: `${REF}-2` } };
    const cookie = receiptAccess.sessionCookie(SECRET, RECEIPT, 0, NOW);
    expect(
      await receiptAccess.hasAccess({
        secret: SECRET,
        locks,
        req: cookieReq(cookie),
        record: other,
        nowMs: NOW,
      }),
    ).toBe(false);
  });
});

describe("receiptEmails", () => {
  it("sends the receipt code and names the receipt in the quote's lockout alert", () => {
    expect(receiptEmails.code(RECEIPT, "123456", 10).subject).toBe(
      "123456 is your code for your receipt",
    );
    const alert = receiptEmails.lockedAlert(RECEIPT, "2026-10-26T09:00:00.000Z", false);
    expect(alert.subject).toBe("Code locked after 5 wrong tries on Q-2026-0007");
    expect(alert.text).toContain(`receipt ${REF}`);
  });
});
