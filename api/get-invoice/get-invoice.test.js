// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// Same module objects as index.js (vi.mock does not reach CommonJS require).
const require = createRequire(import.meta.url);
const { signInvoice } = require("../shared/tokens.js");
const { UNSIGNED_LINKS_ACCEPTED_UNTIL } = require("../shared/invoiceLinks.js");
const cosmos = require("../shared/cosmos.js");
const { createFakeCosmos } = require("../shared/fakeCosmos.js");
const handler = require("./index.js");
const { createHandler } = handler;
const I = require("../shared/invoices/access.js");
const { createFakeLocks } = require("../shared/quotes/fakes.js");

const SECRET = "test-signing-secret";
const sign = (number) => signInvoice(number, SECRET);

// run(number) sends a valid signature; run(number, s) sends s (undefined: none).
// Each call comes from its own IP so the per-IP limit never trips by accident.
let nextIp = 1;
const run = async (number, ...given) => {
  const s = given.length ? given[0] : sign(number);
  const ip = `203.0.113.${nextIp++ % 250}`;
  return call({ number, s }, ip);
};
const call = async ({ number, s }, ip) => {
  const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };
  await handler(context, {
    method: "GET",
    headers: { "x-forwarded-for": ip },
    query: s === undefined ? { number } : { number, s },
  });
  return { status: context.res.status, body: JSON.parse(context.res.body) };
};
const NOT_VALID = "This payment link is not valid. Ask us for a new one at hello@oceaniccoder.dev.";

// Imported from Appwrite, so it carries $createdAt rather than createdAt.
const invoice = {
  id: "inv1",
  invoiceNumber: "INV-948213",
  clientName: "Ama Owusu",
  clientEmail: "ama@example.com",
  total: 500,
  currency: "GHS",
  status: "sent",
  $createdAt: "2026-10-01T09:00:00.000Z",
};

// File-wide: every describe block signs with the same secret and reads the
// same fake Cosmos database.
let invoices;
// Replaces whatever the invoices container holds with these rows.
const holding = (...rows) => {
  invoices.docs.clear();
  for (const row of rows) invoices.seed(row);
};
// The suites below call the default handler with the access gate off, so
// they pin what the pay page got before the gate; "access gate" covers it on.
beforeEach(() => {
  process.env.RECEIPT_SIGNING_SECRET = SECRET;
  process.env.INVOICE_ACCESS_GATE = "off";
  const db = createFakeCosmos();
  invoices = db.container("invoices");
  vi.spyOn(cosmos, "getDatabase").mockReturnValue(db);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.RECEIPT_SIGNING_SECRET;
  delete process.env.INVOICE_ACCESS_GATE;
});

describe("get-invoice", () => {
  // Archiving is admin bookkeeping; the client's pay link keeps working and
  // never learns the invoice was archived.
  it("serves an archived invoice to the pay page without exposing the archive flag", async () => {
    holding({ ...invoice, archivedAt: "2026-10-11T00:00:00.000Z" });
    const r = await run("INV-948213");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ invoiceNumber: "INV-948213", status: "sent", total: 500 });
    expect(r.body).not.toHaveProperty("archivedAt");
  });

  it("returns 404 for an unknown invoice number", async () => {
    expect(await run("INV-NOPE")).toEqual({ status: 404, body: { error: NOT_VALID } });
  });

  it("tells browsers and caches never to keep the reply", async () => {
    holding(invoice);
    const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };
    const number = "INV-948213";
    await handler(context, { method: "GET", headers: {}, query: { number, s: sign(number) } });
    expect(context.res.headers["Cache-Control"]).toBe("no-store");
    expect(context.res.headers["Access-Control-Allow-Origin"]).toBe("https://oceaniccoder.dev");
  });

  it("answers 429 after 30 requests in 10 minutes from one IP, before any lookup", async () => {
    for (let n = 0; n < 30; n += 1) {
      expect((await call({ number: `INV-${n}`, s: undefined }, "198.51.100.7")).status).toBe(404);
    }
    invoices.queries.length = 0;
    const r = await call({ number: "INV-31", s: undefined }, "198.51.100.7");
    expect(r.status).toBe(429);
    expect(invoices.queries).toEqual([]);
    const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };
    await handler(context, {
      method: "GET",
      headers: { "x-forwarded-for": "198.51.100.7" },
      query: { number: "INV-32" },
    });
    expect(context.res.headers["Cache-Control"]).toBe("no-store");
    expect((await call({ number: "INV-31", s: undefined }, "198.51.100.8")).status).toBe(404);
  });

  describe("signed links", () => {
    const notFound = { status: 404, body: { error: NOT_VALID } };
    beforeEach(() => {
      holding(invoice);
    });
    const afterCutoff = () =>
      vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL });

    it("serves the invoice to a valid signature after the cutoff", async () => {
      afterCutoff();
      const r = await run("INV-948213");
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ clientName: "Ama Owusu", clientEmail: "ama@example.com" });
    });

    it.each([
      ["no signature", undefined],
      ["an empty signature", ""],
      ["a wrong signature", "A".repeat(32)],
      ["a malformed signature", "short"],
    ])("answers 404 with no client data to %s after the cutoff", async (_, s) => {
      afterCutoff();
      const r = await run("INV-948213", s);
      expect(r).toEqual(notFound);
      expect(invoices.queries).toEqual([]);
    });

    it("refuses a signature carried over to another invoice number", async () => {
      const r = await run("INV-948214", sign("INV-948213"));
      expect(r).toEqual(notFound);
      expect(invoices.queries).toEqual([]);
    });

    it("answers a bad signature exactly like an invoice that does not exist", async () => {
      afterCutoff();
      const refused = await run("INV-948213", undefined);
      expect(await run("INV-948299")).toEqual(refused);
    });

    it("refuses every signature when the server has no signing secret", async () => {
      afterCutoff();
      delete process.env.RECEIPT_SIGNING_SECRET;
      expect(await run("INV-948213")).toEqual(notFound);
    });

    // Invoice emails sent before signing shipped have no ?s=; an unpaid
    // invoice from before the release keeps working until the cutoff.
    it("still serves an unsigned link to an old unpaid invoice during the grace period", async () => {
      vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL - 1 });
      const r = await run("INV-948213", undefined);
      expect(r.status).toBe(200);
      expect(r.body.invoiceNumber).toBe("INV-948213");
    });

    it.each([
      ["created after the release", { $createdAt: "2026-10-28T00:00:00.000Z" }],
      ["already paid", { status: "paid" }],
      ["with no creation time", { $createdAt: undefined }],
      [
        "created after the release, in Appwrite's offset format",
        { $createdAt: "2026-10-28T00:00:00.000+00:00" },
      ],
    ])("refuses an unsigned link during the grace period to an invoice %s", async (_, over) => {
      vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL - 1 });
      holding({ ...invoice, ...over });
      expect(await run("INV-948213", undefined)).toEqual(notFound);
      expect((await run("INV-948213")).status).toBe(200);
    });

    it("refuses an unsigned link to a server-numbered invoice, even one made before the cutoff", async () => {
      vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL - 1 });
      holding({ ...invoice, invoiceNumber: "INV-2026-0001" });
      expect(await run("INV-2026-0001", undefined)).toEqual(notFound);
      expect((await run("INV-2026-0001")).status).toBe(200);
    });

    it("opens an old unpaid invoice whose creation time uses Appwrite's offset format", async () => {
      vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL - 1 });
      holding({ ...invoice, $createdAt: "2026-10-27T23:59:59.999+00:00" });
      expect((await run("INV-948213", undefined)).status).toBe(200);
    });

    it("refuses a wrong signature even during the grace period", async () => {
      vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL - 1 });
      expect(await run("INV-948213", "A".repeat(32))).toEqual(notFound);
    });
  });
});

describe("get-invoice on Cosmos", () => {
  it("finds the invoice by number and returns only the public fields", async () => {
    invoices.seed({ id: "inv-other", invoiceNumber: "INV-2026-0001", total: 1, status: "paid" });
    invoices.seed({
      id: "inv1",
      invoiceNumber: "INV-948213",
      clientName: "Ama Owusu",
      clientEmail: "ama@example.com",
      clientPhone: "+233 20 000 0000",
      total: 500,
      currency: "GHS",
      status: "sent",
      dueDate: "2026-11-01",
      archivedAt: "2026-10-11T00:00:00.000Z",
    });

    const r = await run("INV-948213");

    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      invoiceNumber: "INV-948213",
      clientName: "Ama Owusu",
      clientEmail: "ama@example.com",
      total: 500,
      currency: "GHS",
      status: "sent",
      dueDate: "2026-11-01",
      estimatedDelivery: null,
    });
  });

  it("passes the number as a query parameter, not in the SQL", async () => {
    await run("INV-1' OR 1=1 --");
    expect(invoices.queries).toEqual([
      {
        query: "SELECT TOP 2 * FROM c WHERE c.invoiceNumber = @number",
        parameters: [{ name: "@number", value: "INV-1' OR 1=1 --" }],
      },
    ]);
  });

  it("returns 404 when no invoice has that number", async () => {
    invoices.seed({ id: "inv1", invoiceNumber: "INV-948213", total: 500, status: "sent" });
    expect(await run("INV-NOPE")).toEqual({ status: 404, body: { error: NOT_VALID } });
  });

  // doc-access refuses a number two rows share (shared/invoices/access.js),
  // so the pay page must too, or the two would disagree on which row it is.
  it("answers the usual 404 when two invoices share the number, naming only the number", async () => {
    invoices.seed({ ...invoice, id: "inv1" });
    invoices.seed({ ...invoice, id: "inv2", clientEmail: "other@example.com" });
    const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };
    await handler(context, {
      method: "GET",
      headers: { "x-forwarded-for": "192.0.2.20" },
      query: { number: "INV-948213", s: sign("INV-948213") },
    });
    expect(context.res.status).toBe(404);
    expect(JSON.parse(context.res.body)).toEqual({ error: NOT_VALID });
    expect(context.log.warn).toHaveBeenCalledWith("invoice-access duplicate number=INV-948213");
    expect(JSON.stringify(context.log.warn.mock.calls)).not.toContain("@example.com");
  });

  it("refuses a bad signature before reading Cosmos", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL });
    invoices.seed({ id: "inv1", invoiceNumber: "INV-948213", total: 500, status: "sent" });
    expect(await run("INV-948213", undefined)).toEqual({
      status: 404,
      body: { error: NOT_VALID },
    });
    expect(await run("INV-948213", "A".repeat(32))).toEqual({
      status: 404,
      body: { error: NOT_VALID },
    });
    expect(invoices.queries).toEqual([]);
  });

  // Rows written on Cosmos carry createdAt; rows imported from Appwrite carry
  // $createdAt (the describe above).
  it("applies the unsigned-link grace period to the Cosmos createdAt", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL - 1 });
    const row = { invoiceNumber: "INV-948213", total: 500, status: "sent" };
    invoices.seed({ ...row, id: "old", createdAt: "2026-10-01T09:00:00.000Z" });
    expect((await run("INV-948213", undefined)).status).toBe(200);

    invoices.docs.clear();
    invoices.seed({ ...row, id: "new", createdAt: "2026-10-28T00:00:00.000Z" });
    expect(await run("INV-948213", undefined)).toEqual({
      status: 404,
      body: { error: NOT_VALID },
    });
    expect((await run("INV-948213")).status).toBe(200);
  });

  it("returns 500 without details when Cosmos fails", async () => {
    vi.spyOn(invoices.items, "query").mockImplementation(() => {
      throw new Error("Request rate is large");
    });
    const r = await run("INV-948213");
    expect(r).toEqual({ status: 500, body: { error: "Internal error" } });
  });

  it("answers 500 after 5 s and cancels the read when Cosmos never replies", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      vi.spyOn(invoices.items, "query").mockImplementation(() => ({
        fetchAll: () => new Promise(() => {}),
      }));
      const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };
      const done = handler(context, {
        method: "GET",
        headers: { "x-forwarded-for": "192.0.2.10" },
        query: { number: "INV-948213", s: sign("INV-948213") },
      });
      await vi.advanceTimersByTimeAsync(5000);
      await done;

      expect(context.res.status).toBe(500);
      expect(JSON.parse(context.res.body)).toEqual({ error: "Internal error" });
      expect(vi.mocked(invoices.items.query).mock.calls[0][1].abortSignal.aborted).toBe(true);
      expect(context.log.error).toHaveBeenCalledWith("get-invoice error:", "timed out");
    } finally {
      vi.useRealTimers();
    }
  });

  // @azure/cosmos reports a refused connection with an empty message.
  it("logs the error code when the Cosmos error has no message", async () => {
    vi.spyOn(invoices.items, "query").mockImplementation(() => {
      throw Object.assign(new Error(""), { name: "RestError", code: "ECONNREFUSED" });
    });
    const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };
    await handler(context, {
      method: "GET",
      headers: { "x-forwarded-for": "192.0.2.11" },
      query: { number: "INV-948213", s: sign("INV-948213") },
    });
    expect(context.res.status).toBe(500);
    expect(context.log.error).toHaveBeenCalledWith("get-invoice error:", "ECONNREFUSED");
  });
});

describe("get-invoice access gate", () => {
  const ACCESS_SECRET = "a".repeat(40);
  const ON = { RECEIPT_SIGNING_SECRET: SECRET, QUOTE_ACCESS_SECRET: ACCESS_SECRET };
  const NOW = new Date("2026-11-25T09:00:00.000Z");
  const LOCKED = { error: "Enter the code we email you to open this invoice.", locked: true };
  const UNAVAILABLE = { error: "Invoice links are unavailable right now. Please try again later." };
  const row = { ...invoice, invoiceNumber: "INV-2026-0042", id: "inv42" };
  // The unlock cookie a browser holds after a code or a link code.
  const unlocked = (record = row, epoch = 0) =>
    I.invoiceAccess.sessionCookie(ACCESS_SECRET, record, epoch, NOW.getTime()).split(";")[0];

  function setup({ rows = [row], env = ON, admin = false } = {}) {
    const locks = createFakeLocks();
    const has = vi.spyOn(locks, "has");
    const findInvoicesByNumber = vi.fn(async (number) =>
      rows.filter((r) => r.invoiceNumber === number),
    );
    const requireAdmin = vi.fn(async () =>
      admin ? { user: { email: "owner@oceaniccoder.dev" } } : { status: 401, error: "Sign in" },
    );
    const h = createHandler({
      env,
      requireAdmin,
      services: () => ({ invoices: { findInvoicesByNumber }, locks, now: () => NOW }),
    });
    const get = async (query, { cookie } = {}) => {
      const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };
      await h(context, {
        method: "GET",
        headers: { "x-forwarded-for": "192.0.2.50", ...(cookie ? { cookie } : {}) },
        query: { number: row.invoiceNumber, s: sign(row.invoiceNumber), ...query },
      });
      return { status: context.res.status, body: JSON.parse(context.res.body), context };
    };
    return { locks, has, findInvoicesByNumber, requireAdmin, get };
  }

  it.each([
    ["unpaid", {}],
    ["paid", { status: "paid" }],
    ["archived", { archivedAt: "2026-11-01T00:00:00.000Z" }],
  ])("answers an %s invoice with 401 locked and no invoice field", async (_, over) => {
    const t = setup({ rows: [{ ...row, ...over }] });
    const r = await t.get({});
    expect(r.status).toBe(401);
    expect(r.body).toEqual(LOCKED);
    expect(t.requireAdmin).not.toHaveBeenCalled();
    // The number only: never the address, the cookie or the signature.
    expect(r.context.log.mock.calls).toEqual([["get-invoice locked number=INV-2026-0042"]]);
  });

  it("is on when the switch is unset, empty or on", async () => {
    for (const gate of [undefined, "", "on"]) {
      const env = gate === undefined ? ON : { ...ON, INVOICE_ACCESS_GATE: gate };
      expect((await setup({ env }).get({})).status).toBe(401);
    }
  });

  it("serves the invoice to an unlocked browser, without a preview flag", async () => {
    const t = setup();
    const r = await t.get({}, { cookie: unlocked() });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      invoiceNumber: "INV-2026-0042",
      clientName: "Ama Owusu",
      clientEmail: "ama@example.com",
      total: 500,
      currency: "GHS",
      status: "sent",
      dueDate: null,
      estimatedDelivery: null,
    });
  });

  it("refuses an unlock for another invoice", async () => {
    const t = setup();
    const other = unlocked({ ...row, id: "inv-other" });
    expect((await t.get({}, { cookie: other })).body).toEqual(LOCKED);
  });

  it("refuses an unlock once access is reset (the next epoch)", async () => {
    const t = setup();
    await I.invoiceAccess.bumpEpoch(t.locks, row);
    expect((await t.get({}, { cookie: unlocked(row, 0) })).body).toEqual(LOCKED);
    expect((await t.get({}, { cookie: unlocked(row, 1) })).status).toBe(200);
  });

  it("refuses an unlock made for the client's old email address", async () => {
    const t = setup({ rows: [{ ...row, clientEmail: "new@example.com" }] });
    expect((await t.get({}, { cookie: unlocked(row) })).body).toEqual(LOCKED);
  });

  it("shows the admin preview with preview: true when the admin session checks out", async () => {
    const t = setup({ admin: true });
    const r = await t.get({ admin: "1" });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ invoiceNumber: "INV-2026-0042", preview: true });
    expect(t.requireAdmin).toHaveBeenCalledTimes(1);
    expect(r.context.res.headers["Set-Cookie"]).toBeUndefined();
  });

  it("stays locked when admin=1 comes without an admin session", async () => {
    const t = setup();
    const r = await t.get({ admin: "1" });
    expect(r).toMatchObject({ status: 401, body: LOCKED });
    expect(t.requireAdmin).toHaveBeenCalledTimes(1);
  });

  it("checks the admin only without a client session", async () => {
    const t = setup({ admin: true });
    const r = await t.get({ admin: "1" }, { cookie: unlocked() });
    expect(r.status).toBe(200);
    expect(r.body).not.toHaveProperty("preview");
    expect(t.requireAdmin).not.toHaveBeenCalled();
  });

  it("answers locator failures with the usual 404 before any lock read", async () => {
    const t = setup();
    for (const query of [{ s: "A".repeat(32) }, { number: "INV-2026-0099" }]) {
      const r = await t.get(query);
      expect(r).toMatchObject({ status: 404, body: { error: I.INVOICE_NOT_FOUND } });
    }
    expect(t.has).not.toHaveBeenCalled();
  });

  it("answers the usual 404 to a number two invoices share, gate on or off", async () => {
    const rows = [row, { ...row, id: "inv43", clientEmail: "other@example.com" }];
    for (const env of [ON, { ...ON, INVOICE_ACCESS_GATE: "off" }]) {
      const t = setup({ rows, env, admin: true });
      const r = await t.get({ admin: "1" }, { cookie: unlocked() });
      expect(r).toEqual({
        status: 404,
        body: { error: I.INVOICE_NOT_FOUND },
        context: expect.anything(),
      });
      expect(r.context.log.warn).toHaveBeenCalledWith(
        "invoice-access duplicate number=INV-2026-0042",
      );
      expect(t.requireAdmin).not.toHaveBeenCalled();
    }
  });

  it("serves the invoice with no cookie and reads no lock while the switch is off", async () => {
    const t = setup({ env: { ...ON, INVOICE_ACCESS_GATE: "off" }, admin: true });
    const r = await t.get({ admin: "1" });
    expect(r.status).toBe(200);
    expect(r.body).not.toHaveProperty("preview");
    expect(t.has).not.toHaveBeenCalled();
    expect(t.requireAdmin).not.toHaveBeenCalled();
  });

  it("works with the switch off even without the access secret", async () => {
    const env = { RECEIPT_SIGNING_SECRET: SECRET, INVOICE_ACCESS_GATE: "off" };
    expect((await setup({ env }).get({})).status).toBe(200);
  });

  it.each([
    ["the access secret is missing", { RECEIPT_SIGNING_SECRET: SECRET }],
    ["the access secret is too short", { ...ON, QUOTE_ACCESS_SECRET: "short" }],
    ["the switch holds an unknown value", { ...ON, INVOICE_ACCESS_GATE: "yes" }],
  ])("fails closed with 503 when %s", async (_, env) => {
    const t = setup({ env, admin: true });
    const r = await t.get({ admin: "1" }, { cookie: unlocked() });
    expect(r.status).toBe(503);
    expect(r.body).toEqual(UNAVAILABLE);
  });

  // doc-access's order: the switch and the secret come before the lookup.
  it.each([
    ["the access secret is missing", { RECEIPT_SIGNING_SECRET: SECRET }],
    ["the switch holds an unknown value", { ...ON, INVOICE_ACCESS_GATE: "yes" }],
  ])("answers 503 before looking the invoice up when %s", async (_, env) => {
    const t = setup({ env });
    expect((await t.get({})).status).toBe(503);
    expect((await t.get({ s: "A".repeat(32) })).status).toBe(503);
    expect(t.findInvoicesByNumber).not.toHaveBeenCalled();
  });

  it("answers 500 without details when the lock store fails", async () => {
    const t = setup();
    t.has.mockRejectedValue(new Error("lock store down"));
    const r = await t.get({}, { cookie: unlocked() });
    expect(r).toMatchObject({ status: 500, body: { error: "Internal error" } });
  });
});
