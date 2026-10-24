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

// Records every email attempt instead of calling Resend. Push statuses onto
// sent.answers to have the next attempts answered with them (default 200).
function captureEmails() {
  const sent = [];
  // Not enumerable, so `expect(sent).toEqual([])` still means "no attempts".
  Object.defineProperty(sent, "answers", { value: [] });
  vi.spyOn(https, "request").mockImplementation((options, onResponse) => {
    let raw = "";
    return {
      on: () => {},
      setTimeout: () => {},
      write: (chunk) => {
        raw += chunk;
      },
      end: () => {
        const statusCode = sent.answers.length ? sent.answers.shift() : 200;
        sent.push({ host: options.hostname, status: statusCode, ...JSON.parse(raw) });
        const res = { statusCode, on: (ev, fn) => ev === "end" && fn() };
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
    expect(sent[0].html).toContain("GHS 500.00");
  });

  it("leaves an underpaid invoice open and only alerts the admin", async () => {
    withRows([], [invoice({ total: 1000 })]);
    expect((await run()).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(sent.map((m) => [m.to[0], m.subject])).toEqual([
      ["admin@example.com", "Action needed: underpayment on invoice INV-2026-0042"],
    ]);
    expect(sent[0].html).toContain("Underpaid by GHS 500.00");
  });

  it("gives up on a Resend request with no response and still finishes", async () => {
    withRows([], [invoice()]);
    const timeouts = [];
    // Resend accepts the request and never answers; the socket timeout fires.
    https.request.mockImplementation(() => {
      const listeners = {};
      const req = {
        on: (ev, fn) => {
          listeners[ev] = fn;
        },
        setTimeout: (ms, fn) => timeouts.push({ ms, fn }),
        destroy: (err) => listeners.error(err),
        write: () => {},
        end: () => timeouts.at(-1).fn(),
      };
      return req;
    });
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, signed(chargeOf()));
    expect(context.res.status).toBe(200);
    expect(timeouts.map((t) => t.ms)).toEqual([10000, 10000]);
    expect(context.log.warn).toHaveBeenCalledWith(
      "Email send failed:",
      "no response from api.resend.com in 10s",
    );
    expect(create).toHaveBeenCalledTimes(1);
  }, 2000);

  it("warns with the status when Resend refuses an email and carries on", async () => {
    withRows([], [invoice()]);
    sent.answers.push(422, 200);
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, signed(chargeOf()));
    expect(context.res.status).toBe(200);
    expect(context.log.warn).toHaveBeenCalledWith("Email send failed:", "Resend answered 422");
    expect(sent.map((m) => [m.to[0], m.status])).toEqual([
      ["ama@example.com", 422],
      ["admin@example.com", 200],
    ]);
    expect(update).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("names a currency mismatch in the admin subject", async () => {
    withRows([], [invoice()]);
    expect((await run(chargeOf({ currency: "USD" }))).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(sent.map((m) => [m.to[0], m.subject])).toEqual([
      ["admin@example.com", "Action needed: currency mismatch on invoice INV-2026-0042"],
    ]);
    expect(sent[0].html).toContain("Currency mismatch. Paid in USD, invoiced in GHS.");
  });

  const subjects = () => sent.map((m) => [m.to[0], m.subject]);
  const FAILED_SUBJECT = "Action needed: a Paystack webhook was not processed";

  it("marks an overpaid invoice paid and tells the admin by how much", async () => {
    withRows([], [invoice({ total: 400 })]);
    expect((await run()).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.any(String), "invoices", "inv1", {
      status: "paid",
    });
    expect(subjects()).toEqual([
      ["ama@example.com", "Payment received for invoice INV-2026-0042"],
      ["admin@example.com", "Payment received for invoice INV-2026-0042"],
    ]);
    expect(sent[1].html).toContain("Overpaid by GHS 100.00. The invoice has been marked paid.");
  });

  it("sends no client receipt for a settled invoice without a client email", async () => {
    withRows([], [invoice({ clientEmail: undefined })]);
    expect((await run()).status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.any(String),
      "payments",
      expect.any(String),
      expect.objectContaining({ clientEmail: "" }),
    );
    expect(subjects()).toEqual([
      ["admin@example.com", "Payment received for invoice INV-2026-0042"],
    ]);
  });

  it("alerts the admin when the payments row cannot be written and still sends receipts", async () => {
    withRows([], [invoice()]);
    create.mockRejectedValue(new Error("payments write refused"));
    expect((await run()).status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(subjects()).toEqual([
      ["admin@example.com", "Action needed: payment record failed for invoice INV-2026-0042"],
      ["ama@example.com", "Payment received for invoice INV-2026-0042"],
      ["admin@example.com", "Payment received for invoice INV-2026-0042"],
    ]);
    expect(sent[0].html).toContain("Error: payments write refused");
    expect(sent[0].html).toContain("scripts/backfill-payments.mjs");
  });

  it("alerts and answers 200 when Appwrite rejects a read", async () => {
    vi.spyOn(sdk.Databases.prototype, "listDocuments").mockRejectedValue(
      new Error("Appwrite unavailable"),
    );
    expect((await run()).status).toBe(200);
    expect(subjects()).toEqual([["admin@example.com", FAILED_SUBJECT]]);
    expect(sent[0].html).toContain("Appwrite rejected the update");
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("alerts and answers 200 when APPWRITE_API_KEY is not set", async () => {
    delete process.env.APPWRITE_API_KEY;
    const list = vi.spyOn(sdk.Databases.prototype, "listDocuments");
    expect((await run()).status).toBe(200);
    expect(subjects()).toEqual([["admin@example.com", FAILED_SUBJECT]]);
    expect(sent[0].html).toContain("APPWRITE_API_KEY is not set");
    expect(list).not.toHaveBeenCalled();
  });

  it("alerts and answers 200 when no invoice matches", async () => {
    withRows([], []);
    expect((await run()).status).toBe(200);
    expect(subjects()).toEqual([["admin@example.com", FAILED_SUBJECT]]);
    expect(sent[0].html).toContain("no invoice matches this payment");
    expect(create).not.toHaveBeenCalled();
  });

  it("records a charge with an empty reference without the duplicate check", async () => {
    const list = vi
      .spyOn(sdk.Databases.prototype, "listDocuments")
      .mockResolvedValueOnce({ documents: [invoice()] });
    expect((await run(chargeOf({ reference: "" }))).status).toBe(200);
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(expect.any(String), "invoices", expect.any(Array));
    expect(create).toHaveBeenCalledWith(
      expect.any(String),
      "payments",
      expect.any(String),
      expect.objectContaining({ paystackReference: "" }),
    );
    expect(sent.map((m) => m.subject)).toContain("Payment received for invoice INV-2026-0042");
  });

  it("takes the same path with DATA_BACKEND=appwrite set explicitly", async () => {
    process.env.DATA_BACKEND = "appwrite";
    try {
      withRows([], [invoice()]);
      expect((await run()).status).toBe(200);
      expect(update).toHaveBeenCalledWith(expect.any(String), "invoices", "inv1", {
        status: "paid",
      });
      expect(create).toHaveBeenCalledTimes(1);
      expect(subjects()).toEqual([
        ["ama@example.com", "Payment received for invoice INV-2026-0042"],
        ["admin@example.com", "Payment received for invoice INV-2026-0042"],
      ]);
    } finally {
      delete process.env.DATA_BACKEND;
    }
  });

  it("ignores a reference that is already recorded", async () => {
    withRows([{ $id: "p0" }], []);
    expect((await run()).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });
});
