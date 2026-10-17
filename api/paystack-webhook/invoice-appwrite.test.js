// @vitest-environment node
// Pins the invoice branch on Appwrite (DATA_BACKEND unset): which rows it
// writes and which emails it sends. The Cosmos branch must not change it.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { createRequire } from "module";

// Load through Node's require so the spies and index.js share one module
// object (vi.mock does not intercept CommonJS require).
const require = createRequire(import.meta.url);
const https = require("https");
const sdk = require("node-appwrite");
const handler = require("./index.js");

const SECRET = "sk_test_webhook";

function signed(event) {
  const rawBody = JSON.stringify(event);
  const signature = crypto.createHmac("sha512", SECRET).update(rawBody).digest("hex");
  return { method: "POST", rawBody, body: event, headers: { "x-paystack-signature": signature } };
}

const chargeOf = (over = {}) => ({
  event: "charge.success",
  data: {
    reference: "PAY-INV-2026-0042-1760000000",
    domain: "test",
    amount: 50000,
    currency: "GHS",
    channel: "mobile_money",
    metadata: { invoiceNumber: "INV-2026-0042" },
    ...over,
  },
});

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

// Records every email instead of calling Resend.
function captureEmails() {
  const sent = [];
  vi.spyOn(https, "request").mockImplementation((options, onResponse) => {
    let raw = "";
    return {
      on: () => {},
      write: (chunk) => {
        raw += chunk;
      },
      end: () => {
        sent.push({ host: options.hostname, ...JSON.parse(raw) });
        const res = { statusCode: 200, on: (ev, fn) => ev === "end" && fn() };
        onResponse(res);
      },
    };
  });
  return sent;
}

describe("paystack-webhook invoice branch on Appwrite", () => {
  let sent;
  let create;
  let update;
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = SECRET;
    process.env.APPWRITE_API_KEY = "test-key";
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_TO_EMAIL = "admin@example.com";
    delete process.env.DATA_BACKEND;
    delete process.env.WRITE_HOLD;
    sent = captureEmails();
    create = vi.spyOn(sdk.Databases.prototype, "createDocument").mockResolvedValue({ $id: "p1" });
    update = vi.spyOn(sdk.Databases.prototype, "updateDocument").mockResolvedValue({});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ["PAYSTACK_SECRET_KEY", "APPWRITE_API_KEY", "RESEND_API_KEY"])
      delete process.env[key];
    delete process.env.RESEND_TO_EMAIL;
  });

  const withRows = (payments, invoices) =>
    vi
      .spyOn(sdk.Databases.prototype, "listDocuments")
      .mockResolvedValueOnce({ documents: payments })
      .mockResolvedValueOnce({ documents: invoices });

  const run = async (event = chargeOf()) => {
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, signed(event));
    return context.res;
  };

  it("marks a settled invoice paid, records the payment and mails client and admin", async () => {
    withRows([], [invoice()]);
    expect((await run()).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.any(String), "invoices", "inv1", {
      status: "paid",
    });
    expect(create).toHaveBeenCalledWith(
      expect.any(String),
      "payments",
      expect.any(String),
      expect.objectContaining({
        invoiceNumber: "INV-2026-0042",
        clientName: "Ama Owusu",
        clientEmail: "ama@example.com",
        amount: 500,
        currency: "GHS",
        method: "momo",
        paystackReference: "PAY-INV-2026-0042-1760000000",
        status: "success",
      }),
    );
    expect(sent.map((m) => [m.to[0], m.subject])).toEqual([
      ["ama@example.com", "Payment received for invoice INV-2026-0042"],
      ["admin@example.com", "Payment received for invoice INV-2026-0042"],
    ]);
    expect(sent[0].html).toContain("₵500.00 GHS");
  });

  it("leaves an underpaid invoice open and only alerts the admin", async () => {
    withRows([], [invoice({ total: 1000 })]);
    expect((await run()).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(sent.map((m) => [m.to[0], m.subject])).toEqual([
      ["admin@example.com", "Action needed: underpayment on invoice INV-2026-0042"],
    ]);
    expect(sent[0].html).toContain("Underpaid by ₵500.00");
  });

  it("ignores a reference that is already recorded", async () => {
    withRows([{ $id: "p0" }], []);
    expect((await run()).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });
});
