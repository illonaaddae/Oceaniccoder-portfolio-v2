// @vitest-environment node
// The invoice kind of the access core: its subject, its names, and the
// locator that finds an invoice from { number, s } the way get-invoice does.
import { describe, it, expect, vi } from "vitest";

const {
  INVOICE_SCHEME,
  INVOICE_NOT_FOUND,
  invoiceSubject,
  invoiceAccess,
  invoiceLocator,
  invoiceEmails,
} = await import("./access.js");
const { quoteAccess } = await import("../quotes/accessScheme.js");
const { createFakeLocks } = await import("../quotes/fakes.js");
const { createFakeCosmos } = await import("../fakeCosmos.js");
const { createCosmosInvoiceStore } = await import("./store.cosmos.js");
const { signInvoice } = await import("../tokens.js");

const SECRET = "s".repeat(40);
const LINK_SECRET = "link-signing-secret";
const NOW = Date.parse("2026-10-26T09:00:00.000Z");
const AFTER_GRACE = Date.parse("2026-11-21T00:00:00.000Z");

const SIGNED = {
  id: "inv-row-1",
  invoiceNumber: "INV-2026-0008",
  clientName: "Ama Owusu",
  clientEmail: "ama@gmail.com",
  status: "sent",
  createdAt: "2026-10-26T08:00:00.000Z",
};
// Emailed before signed links shipped: old number format, unpaid.
const OLD = {
  id: "inv-row-2",
  invoiceNumber: "INV-512345",
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  status: "sent",
  $createdAt: "2026-10-10T08:00:00.000Z",
};
const OLD_PAID = { ...OLD, id: "inv-row-3", invoiceNumber: "INV-598765", status: "paid" };

function setup({ nowMs = NOW } = {}) {
  const db = createFakeCosmos();
  for (const row of [SIGNED, OLD, OLD_PAID]) db.container("invoices").seed(row);
  const invoices = createCosmosInvoiceStore(db);
  invoices.findInvoicesByNumber = vi.fn(invoices.findInvoicesByNumber);
  const svc = { invoices, now: () => new Date(nowMs) };
  const locator = invoiceLocator({ env: { RECEIPT_SIGNING_SECRET: LINK_SECRET } });
  // What the endpoint does: check, then find.
  const open = async (body) => {
    try {
      locator.check(body);
      return await locator.find(svc, body);
    } catch (err) {
      return { status: err.status, error: err.message, ...err.extra };
    }
  };
  return { open, invoices, locator };
}

const sig = (number) => signInvoice(number, LINK_SECRET);
const NOT_FOUND = { status: 404, error: INVOICE_NOT_FOUND, inactive: true };

describe("invoiceSubject", () => {
  it("keys everything by the row id, at revision 0, with the link bound to the number", () => {
    expect(invoiceSubject(SIGNED)).toEqual({
      id: "inv-row-1",
      revision: 0,
      linkId: "pay:INV-2026-0008",
      clientEmail: "ama@gmail.com",
      scopeId: "inv-row-1",
      logName: "INV-2026-0008",
    });
  });

  it("uses its own labels, rows, cookie and switch", () => {
    expect(INVOICE_SCHEME).toMatchObject({
      label: "ia",
      rows: "ia",
      cookie: "ia",
      gateVar: "INVOICE_ACCESS_GATE",
    });
    expect(invoiceAccess.scheme.prunes).toBe(true);
    expect(invoiceAccess.sessionCookieName("inv-row-1")).toMatch(/^__Secure-oc_ia_[0-9a-f]{16}$/);
  });

  it("keeps lock keys in the shape the prune parses, so a live miss row is kept", async () => {
    const locks = createFakeLocks();
    await invoiceAccess.bumpEpoch(locks, SIGNED);
    await invoiceAccess.recordMiss(locks, SIGNED, 1);
    expect([...locks.held].sort()).toEqual(["ia:epoch:inv-row-1:0:1", "ia:miss:inv-row-1:0:1:1"]);
  });
});

describe("invoiceLocator", () => {
  it("finds a signed invoice", async () => {
    const t = setup();
    expect(await t.open({ number: SIGNED.invoiceNumber, s: sig(SIGNED.invoiceNumber) })).toEqual(
      expect.objectContaining({ id: "inv-row-1" }),
    );
  });

  it("finds an unsigned invoice the grace covers, and calls that guessable", async () => {
    const t = setup();
    expect(await t.open({ number: OLD.invoiceNumber })).toEqual(
      expect.objectContaining({ id: "inv-row-2" }),
    );
    expect(t.locator.guessable({ number: OLD.invoiceNumber })).toBe(true);
    expect(t.locator.guessable({ number: OLD.invoiceNumber, s: "" })).toBe(true);
    expect(
      t.locator.guessable({ number: SIGNED.invoiceNumber, s: sig(SIGNED.invoiceNumber) }),
    ).toBe(false);
  });

  it.each([
    ["no number", {}],
    ["a number that isn't a string", { number: 8 }],
    ["an empty number", { number: "" }],
    ["a number over 40 characters", { number: `INV-${"9".repeat(37)}` }],
    ["a signature of the wrong length", { number: SIGNED.invoiceNumber, s: "short" }],
    ["a signature that isn't a string", { number: SIGNED.invoiceNumber, s: 12 }],
  ])("refuses %s before any lookup", async (_name, body) => {
    const t = setup();
    expect(await t.open(body)).toEqual(NOT_FOUND);
    expect(t.invoices.findInvoicesByNumber).not.toHaveBeenCalled();
  });

  it("refuses a wrong signature, and an unsigned link after the grace, before any lookup", async () => {
    const t = setup();
    expect(await t.open({ number: SIGNED.invoiceNumber, s: sig("INV-2026-0009") })).toEqual(
      NOT_FOUND,
    );
    const late = setup({ nowMs: AFTER_GRACE });
    expect(await late.open({ number: OLD.invoiceNumber })).toEqual(NOT_FOUND);
    expect(t.invoices.findInvoicesByNumber).not.toHaveBeenCalled();
    expect(late.invoices.findInvoicesByNumber).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown signed number", { number: "INV-2026-0404", s: sig("INV-2026-0404") }],
    ["an unsigned paid invoice", { number: OLD_PAID.invoiceNumber }],
    ["an unsigned server-numbered invoice", { number: SIGNED.invoiceNumber }],
  ])("answers the same 404 for %s", async (_name, body) => {
    expect(await setup().open(body)).toEqual(NOT_FOUND);
  });

  it("answers 404 for every signature when the signing secret is missing", async () => {
    const locator = invoiceLocator({ env: {} });
    const svc = { invoices: setup().invoices, now: () => new Date(NOW) };
    const body = { number: SIGNED.invoiceNumber, s: sig(SIGNED.invoiceNumber) };
    await expect(locator.find(svc, body)).rejects.toMatchObject({ status: 404 });
  });
});

describe("isolation from quotes", () => {
  // A quote whose id and link match the invoice's, as a worst case.
  const QUOTE = {
    id: SIGNED.id,
    revision: 0,
    clientEmail: SIGNED.clientEmail,
    tokenHash: `pay:${SIGNED.invoiceNumber}`,
  };
  const cookieReq = (setCookie) => ({ headers: { cookie: setCookie.split(";")[0] } });

  it("a quote cookie or link code never opens the invoice, nor the reverse", async () => {
    const locks = createFakeLocks();
    const has = (access, record, cookie) =>
      access.hasAccess({ secret: SECRET, locks, req: cookieReq(cookie), record, nowMs: NOW });
    const quoteCookie = quoteAccess.sessionCookie(SECRET, QUOTE, 0, NOW);
    const invoiceCookie = invoiceAccess.sessionCookie(SECRET, SIGNED, 0, NOW);
    expect(await has(invoiceAccess, SIGNED, invoiceCookie)).toBe(true);
    expect(await has(invoiceAccess, SIGNED, quoteCookie)).toBe(false);
    expect(await has(quoteAccess, QUOTE, invoiceCookie)).toBe(false);
    const check = (access, record, linkCode) =>
      access.checkLinkCode({ secret: SECRET, locks, record, linkCode, nowMs: NOW });
    const quoteCode = quoteAccess.mintLinkCode(SECRET, QUOTE, 0, NOW);
    const invoiceCode = invoiceAccess.mintLinkCode(SECRET, SIGNED, 0, NOW);
    expect(await check(invoiceAccess, SIGNED, invoiceCode)).toMatchObject({ ok: true });
    expect(await check(invoiceAccess, SIGNED, quoteCode)).toEqual({ ok: false, reason: "invalid" });
    expect(await check(quoteAccess, QUOTE, invoiceCode)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("invoiceEmails", () => {
  it("builds the invoice code email and the invoice lockout alert", () => {
    expect(invoiceEmails.code(SIGNED, "123456", 10).subject).toBe(
      "123456 is your code for invoice INV-2026-0008",
    );
    const alert = invoiceEmails.lockedAlert(SIGNED, "2026-10-26T09:00:00.000Z", true);
    expect(alert.subject).toBe("Codes blocked after 15 wrong tries on INV-2026-0008");
    expect(alert.html).toContain("Ama Owusu");
  });

  it("leaves no 'undefined' in the alert when the row has no client name", () => {
    const alert = invoiceEmails.lockedAlert(
      { ...SIGNED, clientName: undefined },
      "2026-10-26T09:00:00.000Z",
      false,
    );
    expect(alert.html + alert.text).not.toContain("undefined");
  });
});
