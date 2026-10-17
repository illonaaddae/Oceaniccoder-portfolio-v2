// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// Same node-appwrite instance as index.js (vi.mock does not reach CommonJS require).
const require = createRequire(import.meta.url);
const sdk = require("node-appwrite");
const cosmos = require("../shared/cosmos.js");
const { createFakeCosmos } = require("../shared/fakeCosmos.js");
const handler = require("./index.js");

const run = async (number) => {
  const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn() }) };
  await handler(context, { method: "GET", query: { number } });
  return { status: context.res.status, body: JSON.parse(context.res.body) };
};

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
      documents: [
        {
          $id: "inv1",
          invoiceNumber: "INV-2026-0042",
          clientName: "Ama Owusu",
          clientEmail: "ama@example.com",
          total: 500,
          currency: "GHS",
          status: "sent",
          archivedAt: "2026-10-11T00:00:00.000Z",
        },
      ],
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
});

describe("get-invoice on Cosmos", () => {
  let invoices;
  beforeEach(() => {
    process.env.DATA_BACKEND = "cosmos";
    const db = createFakeCosmos();
    invoices = db.container("invoices");
    vi.spyOn(cosmos, "getDatabase").mockReturnValue(db);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DATA_BACKEND;
  });

  it("finds the invoice by number and returns only the public fields", async () => {
    invoices.seed({ id: "inv-other", invoiceNumber: "INV-2026-0001", total: 1, status: "paid" });
    invoices.seed({
      id: "inv1",
      invoiceNumber: "INV-2026-0042",
      clientName: "Ama Owusu",
      clientEmail: "ama@example.com",
      clientPhone: "+233 20 000 0000",
      total: 500,
      currency: "GHS",
      status: "sent",
      dueDate: "2026-11-01",
      archivedAt: "2026-10-11T00:00:00.000Z",
    });

    const r = await run("INV-2026-0042");

    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      invoiceNumber: "INV-2026-0042",
      clientName: "Ama Owusu",
      clientEmail: "ama@example.com",
      total: 500,
      currency: "GHS",
      status: "sent",
      dueDate: "2026-11-01",
      estimatedDelivery: null,
    });
  });

  it("needs no Appwrite key and never calls Appwrite", async () => {
    const appwrite = vi.spyOn(sdk.Databases.prototype, "listDocuments");
    invoices.seed({ id: "inv1", invoiceNumber: "INV-2026-0042", total: 500, status: "sent" });

    expect((await run("INV-2026-0042")).status).toBe(200);
    expect(appwrite).not.toHaveBeenCalled();
  });

  it("passes the number as a query parameter, not in the SQL", async () => {
    await run("INV-1' OR 1=1 --");
    expect(invoices.queries).toEqual([
      {
        query: "SELECT TOP 1 * FROM c WHERE c.invoiceNumber = @number",
        parameters: [{ name: "@number", value: "INV-1' OR 1=1 --" }],
      },
    ]);
  });

  it("returns 404 when no invoice has that number", async () => {
    invoices.seed({ id: "inv1", invoiceNumber: "INV-2026-0042", total: 500, status: "sent" });
    expect((await run("INV-NOPE")).status).toBe(404);
  });

  it("returns 500 without details when Cosmos fails", async () => {
    vi.spyOn(invoices.items, "query").mockImplementation(() => {
      throw new Error("Request rate is large");
    });
    const r = await run("INV-2026-0042");
    expect(r).toEqual({ status: 500, body: { error: "Internal error" } });
  });
});
