// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// Same node-appwrite instance as index.js (vi.mock does not reach CommonJS require).
const require = createRequire(import.meta.url);
const sdk = require("node-appwrite");
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
