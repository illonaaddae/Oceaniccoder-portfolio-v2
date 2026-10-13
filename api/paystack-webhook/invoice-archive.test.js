// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { createRequire } from "module";

// Load through Node's require so the spies and index.js share one
// node-appwrite module object (vi.mock does not intercept CommonJS require).
const require = createRequire(import.meta.url);
const sdk = require("node-appwrite");
const handler = require("./index.js");

const SECRET = "sk_test_webhook";

function signed(event) {
  const rawBody = JSON.stringify(event);
  const signature = crypto.createHmac("sha512", SECRET).update(rawBody).digest("hex");
  return { method: "POST", rawBody, body: event, headers: { "x-paystack-signature": signature } };
}

const charge = {
  event: "charge.success",
  data: {
    reference: "PAY-INV-2026-0042-1760000000",
    domain: "test",
    amount: 50000,
    currency: "GHS",
    channel: "card",
    metadata: { invoiceNumber: "INV-2026-0042" },
  },
};

const invoice = (over = {}) => ({
  $id: "inv1",
  invoiceNumber: "INV-2026-0042",
  clientName: "Ama Owusu",
  clientEmail: "ama@example.com",
  total: 500,
  currency: "GHS",
  status: "sent",
  ...over,
});

describe("paystack-webhook invoice branch and archived invoices", () => {
  let list;
  let update;
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = SECRET;
    process.env.APPWRITE_API_KEY = "test-key";
    delete process.env.RESEND_API_KEY; // no emails in tests
    vi.spyOn(sdk.Databases.prototype, "createDocument").mockResolvedValue({ $id: "pay1" });
    update = vi.spyOn(sdk.Databases.prototype, "updateDocument").mockResolvedValue({});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.APPWRITE_API_KEY;
  });

  // First call: duplicate-reference check (none). Second: the invoice lookup.
  const withInvoice = (doc) => {
    list = vi
      .spyOn(sdk.Databases.prototype, "listDocuments")
      .mockResolvedValueOnce({ documents: [] })
      .mockResolvedValueOnce({ documents: [doc] });
  };

  const run = async () => {
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, signed(charge));
    return context.res;
  };

  it("un-archives an archived invoice when it is paid", async () => {
    withInvoice(invoice({ archivedAt: "2026-10-11T00:00:00.000Z" }));
    expect((await run()).status).toBe(200);
    expect(list).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith(expect.any(String), "invoices", "inv1", {
      status: "paid",
      archivedAt: null,
    });
  });

  it("clears an archive that landed between the read and the paid write", async () => {
    withInvoice(invoice());
    update.mockResolvedValueOnce({
      $id: "inv1",
      status: "paid",
      archivedAt: "2026-10-12T00:00:00Z",
    });
    expect((await run()).status).toBe(200);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1].slice(2)).toEqual(["inv1", { archivedAt: null }]);
  });

  it("still records the payment when that late un-archive fails", async () => {
    withInvoice(invoice());
    update
      .mockResolvedValueOnce({ $id: "inv1", status: "paid", archivedAt: "2026-10-12T00:00:00Z" })
      .mockImplementationOnce(async () => {
        throw new Error("down");
      });
    expect((await run()).status).toBe(200);
    expect(sdk.Databases.prototype.createDocument).toHaveBeenCalledTimes(1);
  });

  it("un-archives an archived invoice on a part-payment and still records it", async () => {
    withInvoice(invoice({ total: 1000, archivedAt: "2026-10-11T00:00:00.000Z" }));
    expect((await run()).status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.any(String), "invoices", "inv1", {
      archivedAt: null,
    });
    expect(sdk.Databases.prototype.createDocument).toHaveBeenCalledWith(
      expect.any(String),
      "payments",
      expect.any(String),
      expect.objectContaining({ invoiceNumber: "INV-2026-0042", amount: 500 }),
    );
  });

  it("records a part-payment even if un-archiving fails", async () => {
    withInvoice(invoice({ total: 1000, archivedAt: "2026-10-11T00:00:00.000Z" }));
    update.mockImplementation(async () => {
      throw new Error("no attribute");
    });
    expect((await run()).status).toBe(200);
    expect(sdk.Databases.prototype.createDocument).toHaveBeenCalledTimes(1);
  });

  it("leaves a never-archived part-paid invoice untouched", async () => {
    withInvoice(invoice({ total: 1000 }));
    await run();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not send archivedAt for an invoice that was never archived", async () => {
    withInvoice(invoice());
    await run();
    expect(update).toHaveBeenCalledWith(expect.any(String), "invoices", "inv1", {
      status: "paid",
    });
  });
});
