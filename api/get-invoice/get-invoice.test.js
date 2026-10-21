// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// Same node-appwrite instance as index.js (vi.mock does not reach CommonJS require).
const require = createRequire(import.meta.url);
const sdk = require("node-appwrite");
const { signInvoice } = require("../shared/tokens.js");
const { UNSIGNED_LINKS_ACCEPTED_UNTIL } = require("../shared/invoiceLinks.js");
const handler = require("./index.js");

const SECRET = "test-signing-secret";
const sign = (number) => signInvoice(number, SECRET);

// run(number) sends a valid signature; run(number, s) sends s (undefined: none).
const run = async (number, ...given) => {
  const s = given.length ? given[0] : sign(number);
  const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn() }) };
  await handler(context, { method: "GET", query: s === undefined ? { number } : { number, s } });
  return { status: context.res.status, body: JSON.parse(context.res.body) };
};

const invoice = {
  $id: "inv1",
  invoiceNumber: "INV-2026-0042",
  clientName: "Ama Owusu",
  clientEmail: "ama@example.com",
  total: 500,
  currency: "GHS",
  status: "sent",
};

// File-wide so every describe block signs with the same secret.
beforeEach(() => {
  process.env.RECEIPT_SIGNING_SECRET = SECRET;
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.RECEIPT_SIGNING_SECRET;
});

describe("get-invoice", () => {
  beforeEach(() => {
    process.env.APPWRITE_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.APPWRITE_API_KEY;
  });

  // Archiving is admin bookkeeping; the client's pay link keeps working and
  // never learns the invoice was archived.
  it("serves an archived invoice to the pay page without exposing the archive flag", async () => {
    vi.spyOn(sdk.Databases.prototype, "listDocuments").mockResolvedValue({
      documents: [{ ...invoice, archivedAt: "2026-10-11T00:00:00.000Z" }],
    });
    const r = await run("INV-2026-0042");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ invoiceNumber: "INV-2026-0042", status: "sent", total: 500 });
    expect(r.body).not.toHaveProperty("archivedAt");
  });

  it("returns 404 for an unknown invoice number", async () => {
    vi.spyOn(sdk.Databases.prototype, "listDocuments").mockResolvedValue({ documents: [] });
    expect((await run("INV-NOPE")).status).toBe(404);
  });

  describe("signed links", () => {
    const notFound = { status: 404, body: { error: "Invoice not found" } };
    let lookup;
    beforeEach(() => {
      lookup = vi
        .spyOn(sdk.Databases.prototype, "listDocuments")
        .mockResolvedValue({ documents: [invoice] });
    });
    const afterCutoff = () =>
      vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL });

    it("serves the invoice to a valid signature after the cutoff", async () => {
      afterCutoff();
      const r = await run("INV-2026-0042");
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
      const r = await run("INV-2026-0042", s);
      expect(r).toEqual(notFound);
      expect(lookup).not.toHaveBeenCalled();
    });

    it("refuses a signature carried over to another invoice number", async () => {
      const r = await run("INV-2026-0043", sign("INV-2026-0042"));
      expect(r).toEqual(notFound);
      expect(lookup).not.toHaveBeenCalled();
    });

    it("answers a bad signature exactly like an invoice that does not exist", async () => {
      afterCutoff();
      const refused = await run("INV-2026-0042", undefined);
      lookup.mockResolvedValue({ documents: [] });
      expect(await run("INV-2026-0099")).toEqual(refused);
    });

    it("refuses every signature when the server has no signing secret", async () => {
      afterCutoff();
      delete process.env.RECEIPT_SIGNING_SECRET;
      expect(await run("INV-2026-0042")).toEqual(notFound);
    });

    // Invoice emails sent before signing shipped have no ?s=; they keep
    // working, unchanged, until the cutoff.
    it("still serves an unsigned link during the grace period", async () => {
      vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL - 1 });
      const r = await run("INV-2026-0042", undefined);
      expect(r.status).toBe(200);
      expect(r.body.invoiceNumber).toBe("INV-2026-0042");
    });

    it("refuses a wrong signature even during the grace period", async () => {
      vi.useFakeTimers({ toFake: ["Date"], now: UNSIGNED_LINKS_ACCEPTED_UNTIL - 1 });
      expect(await run("INV-2026-0042", "A".repeat(32))).toEqual(notFound);
    });
  });
});
