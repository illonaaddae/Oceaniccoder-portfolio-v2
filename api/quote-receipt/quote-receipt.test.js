// @vitest-environment node
import { createRequire } from "module";
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const { signReceipt } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");
// The CommonJS instances index.js requires: each access scheme can be created
// once per process, so a second, imported copy would throw.
const require = createRequire(import.meta.url);
const { receiptAccess } = require("../shared/receipts/access.js");
const { quoteAccess } = require("../shared/quotes/accessScheme.js");

const SECRET = "v".repeat(40);
const LINK_SECRET = "s";
const ENV = { QUOTE_ACCESS_SECRET: SECRET, RECEIPT_SIGNING_SECRET: LINK_SECRET };
const NOW = new Date("2026-10-12T09:00:00.000Z");
const REF = "R1";

const quote = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  clientEmail: "kofi@example.com",
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-09T00:00:00.000Z",
  payState: { due: {} },
  tokenHash: "quote-token-hash",
};
const payment = {
  id: "p1",
  kind: "quote",
  quoteId: "q1",
  quoteNumber: "Q-2026-0001",
  stageId: "deposit",
  paystackReference: REF,
  status: "success",
  amountMinor: 6000,
  currency: "GHS",
  method: "momo",
  paidAt: "2026-10-10T00:00:00.000Z",
};
const RECEIPT = { quote, payment };
const valid = { reference: REF, s: signReceipt(REF, LINK_SECRET) };

const cookieOf = (header) => header.split(";")[0];
const receiptCookie = (epoch = 0, record = RECEIPT) =>
  cookieOf(receiptAccess.sessionCookie(SECRET, record, epoch, NOW.getTime()));
const quoteCookie = (q = quote) => cookieOf(quoteAccess.sessionCookie(SECRET, q, 0, NOW.getTime()));

function setup({ env = ENV, admin = false, payments = [payment], quotes = [quote] } = {}) {
  const repo = createFakeRepo({ quotes, payments });
  const locks = createFakeLocks({ now: () => NOW.getTime() });
  const requireAdmin = vi.fn(async () =>
    admin ? { user: { email: "owner@oceaniccoder.dev" } } : { status: 401, error: "Sign in" },
  );
  const handler = createHandler({
    env,
    requireAdmin,
    services: () => ({ repo, locks, now: () => NOW }),
  });
  const call = async (query, { cookie } = {}) => {
    const context = { log: Object.assign(vi.fn(), { error: vi.fn() }) };
    await handler(context, { method: "GET", query, headers: cookie ? { cookie } : {} });
    return { status: context.res.status, body: JSON.parse(context.res.body), context };
  };
  return { repo, locks, requireAdmin, call };
}

const LOCKED = { error: "Enter the code we email you to open this receipt.", locked: true };

describe("quote-receipt", () => {
  it("returns the receipt to a browser holding the receipt's unlock", async () => {
    const r = await setup().call(valid, { cookie: receiptCookie() });
    expect(r.status).toBe(200);
    expect(r.body.receipt).toMatchObject({
      amountMinor: 6000,
      method: "Mobile Money",
      stageLabel: "Deposit",
      balanceMinor: 4000,
    });
  });

  it("answers 401 locked with nothing from the receipt when the browser has no unlock", async () => {
    const t = setup();
    const r = await t.call(valid);
    expect(r).toMatchObject({ status: 401 });
    expect(r.body).toEqual(LOCKED);
    expect(t.requireAdmin).not.toHaveBeenCalled();
  });

  it("opens for a browser signed in to the same quote", async () => {
    expect((await setup().call(valid, { cookie: quoteCookie() })).status).toBe(200);
  });

  it("refuses an unlock for another quote or another receipt", async () => {
    const other = { ...quote, id: "q2", quoteNumber: "Q-2026-0002" };
    expect((await setup().call(valid, { cookie: quoteCookie(other) })).body).toEqual(LOCKED);
    const otherReceipt = { quote, payment: { ...payment, paystackReference: "R2" } };
    expect((await setup().call(valid, { cookie: receiptCookie(0, otherReceipt) })).body).toEqual(
      LOCKED,
    );
  });

  it("locks again after New link or Revise bumps the quote's epoch", async () => {
    const t = setup();
    const cookie = `${receiptCookie()}; ${quoteCookie()}`;
    expect((await t.call(valid, { cookie })).status).toBe(200);
    await receiptAccess.bumpEpoch(t.locks, RECEIPT);
    expect((await t.call(valid, { cookie })).body).toEqual(LOCKED);
  });

  it("locks again when the quote is revised", async () => {
    const t = setup({ quotes: [{ ...quote, revision: 2 }] });
    const cookie = `${receiptCookie()}; ${quoteCookie()}`;
    expect((await t.call(valid, { cookie })).body).toEqual(LOCKED);
  });

  it("lets the admin in only with admin=1 and a dashboard session", async () => {
    expect((await setup({ admin: true }).call(valid)).status).toBe(401);
    const t = setup({ admin: true });
    expect((await t.call({ ...valid, admin: "1" })).status).toBe(200);
    expect((await setup().call({ ...valid, admin: "1" })).body).toEqual(LOCKED);
  });

  it("answers as before the gate when RECEIPT_ACCESS_GATE is off", async () => {
    const r = await setup({ env: { ...ENV, RECEIPT_ACCESS_GATE: "off" } }).call(valid);
    expect(r.status).toBe(200);
    expect(r.body.receipt.amountMinor).toBe(6000);
  });

  it("fails closed with 503 when the gate is on and the access secret is missing or bad", async () => {
    const noSecret = await setup({ env: { RECEIPT_SIGNING_SECRET: LINK_SECRET } }).call(valid);
    expect(noSecret.status).toBe(503);
    expect(noSecret.body).toEqual({ error: expect.any(String) });
    const badSwitch = await setup({ env: { ...ENV, RECEIPT_ACCESS_GATE: "maybe" } }).call(valid, {
      cookie: receiptCookie(),
    });
    expect(badSwitch.status).toBe(503);
    expect(badSwitch.body.receipt).toBeUndefined();
  });

  it("404s the same way on a bad signature, an unpaid payment or a missing quote", async () => {
    const NOT_FOUND = { error: "Receipt not found.", inactive: true };
    const cookie = receiptCookie();
    expect((await setup().call({ reference: REF, s: "x".repeat(32) }, { cookie })).body).toEqual(
      NOT_FOUND,
    );
    expect((await setup().call({ reference: REF }, { cookie })).body).toEqual(NOT_FOUND);
    expect(
      (await setup({ payments: [{ ...payment, status: "pending" }] }).call(valid, { cookie })).body,
    ).toEqual(NOT_FOUND);
    expect((await setup({ quotes: [] }).call(valid, { cookie })).status).toBe(404);
  });
});
