// @vitest-environment node
// The webhook handler with DATA_BACKEND=cosmos and WRITE_HOLD: status codes,
// alerts and the emails it sends. The step-by-step flow is in
// invoiceCharge.test.js.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { createRequire } from "module";

// Load through Node's require so the spies and index.js share one module
// object (vi.mock does not intercept CommonJS require).
const require = createRequire(import.meta.url);
const https = require("https");
const sdk = require("node-appwrite");
const cosmos = require("../shared/cosmos.js");
const quoteService = require("../shared/quotes/service.js");
const { createFakeCosmos } = require("../shared/fakeCosmos.js");
const { paymentIdFor } = require("../shared/quotes/repo.cosmos.js");
const { lockId } = require("../shared/tokens.js");
const handler = require("./index.js");

const SECRET = "sk_test_webhook";
const REFERENCE = "PAY-INV-2026-0042-1760000000";

function signed(event, secret = SECRET) {
  const rawBody = JSON.stringify(event);
  const signature = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return { method: "POST", rawBody, body: event, headers: { "x-paystack-signature": signature } };
}

const chargeOf = (over = {}) => ({
  event: "charge.success",
  data: {
    reference: REFERENCE,
    domain: "test",
    amount: 50000,
    currency: "GHS",
    channel: "card",
    metadata: { invoiceNumber: "INV-2026-0042" },
    ...over,
  },
});

const invoiceDoc = (over = {}) => ({
  id: "inv1",
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
        onResponse({ statusCode, on: (ev, fn) => ev === "end" && fn() });
      },
    };
  });
  return sent;
}

const ENV = {
  PAYSTACK_SECRET_KEY: SECRET,
  RESEND_API_KEY: "re_test",
  RESEND_TO_EMAIL: "admin@example.com",
  DATA_BACKEND: "cosmos",
};

describe("paystack-webhook invoice branch on Cosmos", () => {
  let db;
  let sent;
  beforeEach(() => {
    Object.assign(process.env, ENV);
    delete process.env.WRITE_HOLD;
    delete process.env.APPWRITE_API_KEY;
    db = createFakeCosmos();
    db.container("invoices").seed(invoiceDoc());
    vi.spyOn(cosmos, "getDatabase").mockReturnValue(db);
    sent = captureEmails();
    // The Cosmos branch must never reach Appwrite.
    for (const method of ["listDocuments", "createDocument", "updateDocument"]) {
      vi.spyOn(sdk.Databases.prototype, method).mockRejectedValue(new Error("Appwrite called"));
    }
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of [...Object.keys(ENV), "WRITE_HOLD"]) delete process.env[key];
  });

  // Shared by every run in a test, so a test can count log lines across runs.
  let handlerLog;
  beforeEach(() => {
    handlerLog = Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() });
  });
  const run = async (req = signed(chargeOf())) => {
    const context = { res: null, log: handlerLog };
    await handler(context, req);
    return context.res;
  };
  const subjects = () => sent.map((m) => [m.to[0], m.subject]);
  const payment = () => db.container("payments").docs.get(paymentIdFor(REFERENCE));

  it("marks the invoice paid, records the payment and mails client and admin", async () => {
    expect((await run()).status).toBe(200);
    expect(db.container("invoices").docs.get("inv1").status).toBe("paid");
    expect(payment()).toMatchObject({ method: "card", invoiceApplied: true });
    expect(subjects()).toEqual([
      ["ama@example.com", "Payment received for invoice INV-2026-0042"],
      ["admin@example.com", "Payment received for invoice INV-2026-0042"],
    ]);
    expect(sent[0].html).toContain("₵500.00 GHS");
    expect(sent[1].html).toContain(REFERENCE);
  });

  it("answers 200 and sends nothing for a repeated delivery", async () => {
    await run();
    sent.length = 0;
    expect((await run()).status).toBe(200);
    expect(sent).toEqual([]);
    expect(db.container("payments").docs.size).toBe(1);
  });

  it("only alerts the admin on an underpayment", async () => {
    db.container("invoices").seed(invoiceDoc({ total: 1000 }));
    expect((await run()).status).toBe(200);
    expect(db.container("invoices").docs.get("inv1").status).toBe("sent");
    expect(subjects()).toEqual([
      ["admin@example.com", "Action needed: underpayment on invoice INV-2026-0042"],
    ]);
    expect(sent[0].html).toContain("Underpaid by ₵500.00. Expected ₵1000.00.");
  });

  it("only alerts the admin on a currency mismatch", async () => {
    expect((await run(signed(chargeOf({ currency: "USD" })))).status).toBe(200);
    expect(db.container("invoices").docs.get("inv1").status).toBe("sent");
    expect(subjects()).toEqual([
      ["admin@example.com", "Action needed: underpayment on invoice INV-2026-0042"],
    ]);
    expect(sent[0].html).toContain("Currency mismatch. Paid in USD, invoiced in GHS.");
  });

  const unavailable = () => Object.assign(new Error("Service Unavailable"), { code: 503 });
  // Fails the next `count` calls of a fake-container hook, then lets them through.
  const failNext = (container, hook, count) => {
    let left = count;
    container.hooks[hook] = async () => {
      if (left-- > 0) throw unavailable();
    };
  };
  const RETRY_SUBJECT = "Action needed: Paystack will retry a payment for invoice INV-2026-0042";
  const FAILED_SUBJECT = "Action needed: a Paystack webhook was not processed";

  it("says a retryable failure will be recorded and must not be marked paid by hand", async () => {
    failNext(db.container("invoices"), "beforeReplace", 1);
    expect((await run()).status).toBe(500);
    expect(subjects()).toEqual([["admin@example.com", RETRY_SUBJECT]]);
    const { html } = sent[0];
    expect(html).toContain("Paystack will retry it");
    expect(html).toContain("the payment will be recorded automatically");
    expect(html).toContain("Do not mark the invoice paid by hand.");
    expect(html).not.toContain("mark the invoice paid by hand if the money did arrive");
    expect(html).toContain("Cosmos rejected the update");

    sent.length = 0;
    expect((await run()).status).toBe(200);
    expect(db.container("invoices").docs.get("inv1").status).toBe("paid");
    expect(subjects()).toHaveLength(2);
  });

  it("mails a retryable failure once per reference once the payment row exists", async () => {
    failNext(db.container("invoices"), "beforeReplace", 2);
    const first = await run();
    const second = await run();
    expect([first.status, second.status]).toEqual([500, 500]);
    expect(subjects()).toEqual([["admin@example.com", RETRY_SUBJECT]]);
    expect(payment().alertedAt).toEqual(expect.any(String));
    expect(handlerLog.error).toHaveBeenCalledWith(
      expect.stringContaining("Cosmos rejected the update; Paystack will retry"),
    );
    expect(handlerLog.error.mock.calls.filter(([m]) => m.includes("will retry"))).toHaveLength(2);
  });

  it("mails a retryable failure once per reference before the payment row exists", async () => {
    failNext(db.container("payments"), "beforeRead", 1);
    expect((await run()).status).toBe(500);
    failNext(db.container("payments"), "beforeRead", 1);
    expect((await run()).status).toBe(500);
    expect(subjects()).toEqual([["admin@example.com", RETRY_SUBJECT]]);
    expect(db.container("locks").docs.has(lockId(`alert:${REFERENCE}`))).toBe(true);
    expect(db.container("payments").docs.size).toBe(0);
  });

  it("mails once per process when Cosmos cannot record the alert", async () => {
    cosmos.getDatabase.mockImplementation(() => {
      throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
    });
    const event = signed(chargeOf({ reference: "PAY-INV-2026-0042-unconfigured" }));
    expect((await run(event)).status).toBe(500);
    expect((await run(event)).status).toBe(500);
    expect(subjects()).toEqual([["admin@example.com", RETRY_SUBJECT]]);
  });

  it("answers 500 without an alert while another delivery holds the emails", async () => {
    db.container("payments").seed({
      id: paymentIdFor(REFERENCE),
      invoiceNumber: "INV-2026-0042",
      paystackReference: REFERENCE,
      invoiceApplied: true,
      notifyClaimedAt: new Date().toISOString(),
    });
    expect((await run()).status).toBe(500);
    expect(sent).toEqual([]);
  });

  it("alerts and answers 200 when no invoice matches", async () => {
    db.container("invoices").docs.clear();
    expect((await run()).status).toBe(200);
    expect(subjects()).toEqual([["admin@example.com", FAILED_SUBJECT]]);
    expect(db.container("payments").docs.size).toBe(0);
  });

  it("alerts and answers 200 without marking anything when two invoices share the number", async () => {
    db.container("invoices").seed(invoiceDoc({ id: "inv2" }));
    expect((await run()).status).toBe(200);
    expect(subjects()).toEqual([["admin@example.com", FAILED_SUBJECT]]);
    expect(sent[0].html).toContain("more than one invoice has this number");
    expect(db.container("invoices").docs.get("inv1").status).toBe("sent");
    expect(db.container("invoices").docs.get("inv2").status).toBe("sent");
    expect(db.container("payments").docs.size).toBe(0);
  });

  it("alerts, answers 200 and leaves alone a row at our id that belongs to a quote", async () => {
    const quoteRow = db.container("payments").seed({
      id: paymentIdFor(REFERENCE),
      paystackReference: REFERENCE,
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
      invoiceApplied: false,
    });
    expect((await run()).status).toBe(200);
    expect(subjects()).toEqual([["admin@example.com", FAILED_SUBJECT]]);
    expect(sent[0].html).toContain("belongs to another charge");
    expect(payment()._etag).toBe(quoteRow._etag);
    expect(db.container("invoices").docs.get("inv1").status).toBe("sent");
  });

  it("records a payment against an invoice with no total but leaves it open", async () => {
    db.container("invoices").seed(invoiceDoc({ total: null }));
    expect((await run()).status).toBe(200);
    expect(db.container("invoices").docs.get("inv1").status).toBe("sent");
    expect(payment()).toMatchObject({ amount: 500, invoiceApplied: true });
    expect(subjects()).toEqual([
      ["admin@example.com", "Action needed: payment on invoice INV-2026-0042 could not be checked"],
    ]);
    expect(sent[0].html).toContain("has no usable total");
  });

  it("alerts and answers 200 for a charge without a reference", async () => {
    expect((await run(signed(chargeOf({ reference: "" })))).status).toBe(200);
    expect(sent[0].html).toContain("payment has no Paystack reference");
    expect(db.container("payments").docs.size).toBe(0);
  });

  // The only test in this file with an invalid DATA_BACKEND: the once-per-
  // process flag lives in index.js for the life of the module.
  it("answers 500 to an invalid DATA_BACKEND and mails about it once", async () => {
    process.env.DATA_BACKEND = "cosmo";
    expect((await run()).status).toBe(500);
    expect((await run()).status).toBe(500);
    expect(subjects()).toEqual([
      ["admin@example.com", "Action needed: Paystack webhooks are failing and will be retried"],
    ]);
    expect(sent[0].html).toContain("DATA_BACKEND is not valid");
    expect(db.container("payments").docs.size).toBe(0);
  });

  it("does not touch Cosmos when DATA_BACKEND is unset", async () => {
    delete process.env.DATA_BACKEND;
    await run();
    expect(cosmos.getDatabase).not.toHaveBeenCalled();
  });
});

describe("paystack-webhook under WRITE_HOLD", () => {
  let sent;
  let quote;
  beforeEach(() => {
    Object.assign(process.env, ENV, { WRITE_HOLD: "1", APPWRITE_API_KEY: "test-key" });
    sent = captureEmails();
    vi.spyOn(cosmos, "getDatabase").mockImplementation(() => {
      throw new Error("Cosmos called");
    });
    quote = vi.spyOn(quoteService, "handleQuoteCharge");
    for (const method of ["listDocuments", "createDocument", "updateDocument"]) {
      vi.spyOn(sdk.Databases.prototype, method).mockRejectedValue(new Error("Appwrite called"));
    }
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of [...Object.keys(ENV), "WRITE_HOLD", "APPWRITE_API_KEY"])
      delete process.env[key];
  });

  const run = async (req) => {
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, req);
    return context.res;
  };

  it.each(["cosmos", "appwrite"])(
    "answers 503 to an invoice charge on %s and does no work",
    async (backend) => {
      process.env.DATA_BACKEND = backend;
      expect((await run(signed(chargeOf()))).status).toBe(503);
      expect(cosmos.getDatabase).not.toHaveBeenCalled();
      expect(sdk.Databases.prototype.listDocuments).not.toHaveBeenCalled();
      expect(sent).toEqual([]);
    },
  );

  it("answers 503 to a quote charge without calling the quote service", async () => {
    const event = chargeOf({ reference: "Q-2026-0001-1-ABCDEFGH", metadata: { kind: "quote" } });
    expect((await run(signed(event))).status).toBe(503);
    expect(quote).not.toHaveBeenCalled();
  });

  it("still rejects and reports a bad signature", async () => {
    expect((await run(signed(chargeOf(), "sk_test_other"))).status).toBe(200);
    expect(sent.map((m) => m.subject)).toEqual([
      "Action needed: a Paystack webhook was not processed",
    ]);
  });
});
