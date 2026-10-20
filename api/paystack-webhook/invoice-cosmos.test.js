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
const { lockId, paymentIdFor } = require("../shared/tokens.js");
const handler = require("./index.js");

// Once PR #200 lands, unverified requests email at most once an hour per
// process; reset that so each test sees its own alert. A no-op before then.
const resetUnverifiedAlert = () => handler.resetUnverifiedAlert?.();

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
    resetUnverifiedAlert();
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
      ["admin@example.com", "Action needed: currency mismatch on invoice INV-2026-0042"],
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
  const UNTRACKED_SUBJECT =
    "Action needed: a payment for invoice INV-2026-0042 may need recording by hand";
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
    expect(html).toContain("Cosmos rejected the update (status 503)");

    sent.length = 0;
    expect((await run()).status).toBe(200);
    expect(db.container("invoices").docs.get("inv1").status).toBe("paid");
    expect(subjects()).toHaveLength(2);
  });

  it("sends no escalation for a recorded payment whose invoice can no longer be read", async () => {
    db.container("payments").seed({
      id: paymentIdFor(REFERENCE),
      invoiceNumber: "INV-2026-0042",
      paystackReference: REFERENCE,
      amount: 500,
      currency: "GHS",
      invoiceApplied: true,
      invoiceId: "inv1",
      settles: true,
      expected: 500,
      invoiceCurrency: "GHS",
    });
    db.container("invoices").hooks.beforeRead = async () => {
      throw unavailable();
    };
    expect((await run()).status).toBe(500);
    backdateAlert(25);
    expect((await run()).status).toBe(500);
    expect(subjects()).toEqual([
      [
        "admin@example.com",
        "Paystack will retry the confirmation emails for a recorded payment on invoice INV-2026-0042",
      ],
    ]);
  });

  it("says the payment is recorded when its invoice is renumbered after being applied", async () => {
    db.container("payments").seed({
      id: paymentIdFor(REFERENCE),
      invoiceNumber: "INV-2026-0042",
      paystackReference: REFERENCE,
      amount: 500,
      currency: "GHS",
      invoiceApplied: true,
      invoiceId: "inv1",
      settles: true,
      expected: 500,
      invoiceCurrency: "GHS",
    });
    db.container("invoices").docs.get("inv1").invoiceNumber = "INV-2026-0099";
    expect((await run()).status).toBe(200);
    expect(subjects()).toEqual([
      [
        "admin@example.com",
        "Action needed: receipt not sent for a recorded payment on invoice INV-2026-0042",
      ],
    ]);
    const { html } = sent[0];
    expect(html).toContain("The payment is recorded");
    expect(html).toContain("the confirmation emails were not sent");
    expect(html).not.toContain("may be unrecorded");
  });

  it("does not move a resumed payment to another invoice that took the old number", async () => {
    failNext(db.container("invoices"), "beforeReplace", 1);
    expect((await run()).status).toBe(500);
    expect(payment()).toMatchObject({ invoiceId: "inv1", invoiceApplied: false });

    db.container("invoices").docs.get("inv1").invoiceNumber = "INV-2026-0099";
    db.container("invoices").seed(invoiceDoc({ id: "inv2" }));
    sent.length = 0;
    expect((await run()).status).toBe(200);
    expect(db.container("invoices").docs.get("inv2").status).toBe("sent");
    expect(db.container("invoices").docs.get("inv1").status).toBe("sent");
    expect(payment().invoiceApplied).toBe(false);
    expect(subjects()).toEqual([["admin@example.com", FAILED_SUBJECT]]);
    expect(sent[0].html).toContain("its invoice was renumbered or deleted");
  });

  it("does not say a payment is waiting when only saving notifiedAt failed", async () => {
    db.container("payments").hooks.beforeReplace = async (id, body) => {
      if (body.notifiedAt) throw unavailable();
    };
    expect((await run()).status).toBe(500);
    expect(subjects()).toEqual([
      ["ama@example.com", "Payment received for invoice INV-2026-0042"],
      ["admin@example.com", "Payment received for invoice INV-2026-0042"],
      [
        "admin@example.com",
        "Paystack will retry the confirmation emails for a recorded payment on invoice INV-2026-0042",
      ],
    ]);
    const { html } = sent[2];
    expect(html).toContain("The payment is recorded");
    expect(html).toContain("the client may get the receipt twice");
    expect(html).not.toContain("waiting to be recorded");
    expect(html).not.toContain("Do not mark the invoice paid by hand");
  });

  it("finishes a paid run with the settlement it recorded, not the edited invoice", async () => {
    // Replaces on the payments row: 1 invoiceApplied, 2 the email claim.
    let replaces = 0;
    db.container("payments").hooks.beforeReplace = async () => {
      if (++replaces === 2) throw unavailable();
    };
    expect((await run()).status).toBe(500);
    expect(db.container("invoices").docs.get("inv1").status).toBe("paid");
    expect(payment()).toMatchObject({ settles: true, expected: 500, invoiceCurrency: "GHS" });

    db.container("invoices").docs.get("inv1").total = 1000;
    sent.length = 0;
    expect((await run()).status).toBe(200);
    expect(subjects()).toEqual([
      ["ama@example.com", "Payment received for invoice INV-2026-0042"],
      ["admin@example.com", "Payment received for invoice INV-2026-0042"],
    ]);
  });

  it("mails a retryable failure once per reference once the payment row exists", async () => {
    failNext(db.container("invoices"), "beforeReplace", 2);
    const first = await run();
    const second = await run();
    expect([first.status, second.status]).toEqual([500, 500]);
    expect(subjects()).toEqual([["admin@example.com", RETRY_SUBJECT]]);
    expect(payment().alertedAt).toEqual(expect.any(String));
    expect(handlerLog.error).toHaveBeenCalledWith(
      expect.stringContaining("Cosmos rejected the update (status 503); Paystack will retry"),
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

  const ESCALATION_SUBJECT =
    "Action needed: a payment for invoice INV-2026-0042 is still unrecorded after 24 hours";
  const alertLock = () => db.container("locks").docs.get(lockId(`alert:${REFERENCE}`));
  const backdateAlert = (hours) => {
    alertLock().firstFailedAt = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  };

  it("escalates once when the same payment still fails 24 hours after the first alert", async () => {
    failNext(db.container("invoices"), "beforeReplace", 4);
    expect((await run()).status).toBe(500);
    expect(alertLock().firstFailedAt).toEqual(expect.any(String));
    backdateAlert(23);
    expect((await run()).status).toBe(500);
    expect(subjects()).toEqual([["admin@example.com", RETRY_SUBJECT]]);

    backdateAlert(24);
    expect((await run()).status).toBe(500);
    expect((await run()).status).toBe(500);
    expect(subjects()).toEqual([
      ["admin@example.com", RETRY_SUBJECT],
      ["admin@example.com", ESCALATION_SUBJECT],
    ]);
    const { html } = sent[1];
    expect(html).toContain("still failing 24 hours after");
    expect(html).toContain("72 hours after the charge");
    expect(html).toContain("record the payment by hand");
    expect(alertLock().escalatedAt).toEqual(expect.any(String));
  });

  it("escalates on the next retry when the escalation could not be sent", async () => {
    failNext(db.container("invoices"), "beforeReplace", 3);
    expect((await run()).status).toBe(500);
    backdateAlert(25);
    sent.answers.push(500);
    expect((await run()).status).toBe(500);
    expect(alertLock().escalatedAt).toBeNull();
    expect((await run()).status).toBe(500);
    expect(sent.map((m) => [m.subject, m.status])).toEqual([
      [RETRY_SUBJECT, 200],
      [ESCALATION_SUBJECT, 500],
      [ESCALATION_SUBJECT, 200],
    ]);
  });

  it("does not escalate a recorded payment whose emails keep failing", async () => {
    db.container("payments").hooks.beforeReplace = async (id, body) => {
      if (body.notifiedAt || body.notifyClaimedAt) throw unavailable();
    };
    expect((await run()).status).toBe(500);
    backdateAlert(25);
    expect((await run()).status).toBe(500);
    expect(sent.map((m) => m.subject)).not.toContain(ESCALATION_SUBJECT);
  });

  const ESCALATION =
    "Action needed: a payment for invoice INV-2026-0042 is still unrecorded after 24 hours";
  const RECORDED_SUBJECT =
    "Paystack will retry the confirmation emails for a recorded payment on invoice INV-2026-0042";
  const failPaymentReads = () => {
    db.container("payments").hooks.beforeReplace = null;
    db.container("payments").hooks.beforeRead = async () => {
      throw Object.assign(new Error("throttled"), { code: 429 });
    };
  };

  it("does not escalate a recorded payment when its row can no longer be read", async () => {
    db.container("payments").hooks.beforeReplace = async (id, body) => {
      if (body.notifiedAt) throw unavailable();
    };
    expect((await run()).status).toBe(500);
    expect(alertLock().recorded).toBe(true);
    failPaymentReads();
    backdateAlert(25);
    expect((await run()).status).toBe(500);
    expect(sent.map((m) => m.subject)).not.toContain(ESCALATION);
    expect(sent.map((m) => m.subject)).toContain(RECORDED_SUBJECT);
  });

  it("notes on the alert lock when a later failure finds the payment recorded", async () => {
    failNext(db.container("invoices"), "beforeReplace", 1);
    expect((await run()).status).toBe(500);
    db.container("payments").hooks.beforeReplace = async (id, body) => {
      if (body.notifiedAt) throw unavailable();
    };
    expect((await run()).status).toBe(500);
    expect(alertLock().recorded).toBe(true);
    failPaymentReads();
    backdateAlert(25);
    expect((await run()).status).toBe(500);
    expect(sent.map((m) => m.subject)).not.toContain(ESCALATION);
  });

  it("mails on the next retry when the claimed alert could not be sent", async () => {
    failNext(db.container("invoices"), "beforeReplace", 3);
    sent.answers.push(500);
    expect((await run()).status).toBe(500);
    expect(payment().alertedAt).toBeNull();
    expect(db.container("locks").docs.has(lockId(`alert:${REFERENCE}`))).toBe(false);
    expect((await run()).status).toBe(500);
    expect((await run()).status).toBe(500);
    expect(sent.map((m) => [m.subject, m.status])).toEqual([
      [RETRY_SUBJECT, 500],
      [RETRY_SUBJECT, 200],
    ]);
    expect(payment().alertedAt).toEqual(expect.any(String));
  });

  it("mails on the next retry when the alert before the payment row could not be sent", async () => {
    sent.answers.push(503);
    failNext(db.container("payments"), "beforeRead", 1);
    expect((await run()).status).toBe(500);
    expect(db.container("locks").docs.size).toBe(0);
    failNext(db.container("payments"), "beforeRead", 1);
    expect((await run()).status).toBe(500);
    expect(sent.map((m) => m.status)).toEqual([503, 200]);
    expect(db.container("locks").docs.has(lockId(`alert:${REFERENCE}`))).toBe(true);
  });

  it("takes no alert claim when no email can be sent", async () => {
    delete process.env.RESEND_API_KEY;
    failNext(db.container("invoices"), "beforeReplace", 2);
    expect((await run()).status).toBe(500);
    expect(db.container("locks").docs.size).toBe(0);
    expect(payment().alertedAt).toBeUndefined();
    process.env.RESEND_API_KEY = "re_test";
    expect((await run()).status).toBe(500);
    expect(sent.map((m) => m.subject)).toEqual([RETRY_SUBJECT]);
  });

  it("mails once per process when Cosmos cannot record the alert, retrying a failed send", async () => {
    cosmos.getDatabase.mockImplementation(() => {
      throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
    });
    const event = signed(chargeOf({ reference: "PAY-INV-2026-0042-send-fails" }));
    sent.answers.push(500);
    for (let i = 0; i < 3; i++) expect((await run(event)).status).toBe(500);
    expect(sent.map((m) => [m.subject, m.status])).toEqual([
      [UNTRACKED_SUBJECT, 500],
      [UNTRACKED_SUBJECT, 200],
    ]);
  });

  it("says when the deadline is unknown on an untracked alert without a charge time", async () => {
    cosmos.getDatabase.mockImplementation(() => {
      throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
    });
    const event = signed(chargeOf({ reference: "PAY-INV-2026-0042-no-time" }));
    expect((await run(event)).status).toBe(500);
    expect(sent[0].html).toContain("72 hours after the charge");
    expect(sent[0].html).toContain("Paystack dashboard");
  });

  it("mails once per process when Cosmos cannot record the alert", async () => {
    cosmos.getDatabase.mockImplementation(() => {
      throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
    });
    const event = signed(
      chargeOf({
        reference: "PAY-INV-2026-0042-unconfigured",
        paid_at: "2026-10-20T09:15:00.000Z",
      }),
    );
    expect((await run(event)).status).toBe(500);
    expect((await run(event)).status).toBe(500);
    expect(subjects()).toEqual([["admin@example.com", UNTRACKED_SUBJECT]]);
    const { html } = sent[0];
    expect(html).toContain("Cosmos could not keep track of this alert");
    expect(html).toContain("no follow-up email will come");
    expect(html).toContain("2026-10-23 09:15 UTC");
    expect(html).toContain("record the payment by hand");
    expect(html).not.toContain("Do not mark the invoice paid by hand");
    expect(html).not.toContain("one more email follows");
    expect(sent[0].html).toContain("Reason: the payment could not be recorded");
    expect(sent[0].html).not.toContain("Cosmos rejected the update");
  });

  it("answers 500 without an alert while another delivery holds the emails", async () => {
    db.container("payments").seed({
      id: paymentIdFor(REFERENCE),
      invoiceNumber: "INV-2026-0042",
      paystackReference: REFERENCE,
      amount: 500,
      currency: "GHS",
      invoiceApplied: true,
      invoiceId: "inv1",
      settles: true,
      expected: 500,
      invoiceCurrency: "GHS",
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

  it("ignores a metadata invoiceNumber that is not a string and reads the reference", async () => {
    const event = chargeOf({ metadata: { invoiceNumber: ["INV-2026-0042"] } });
    expect((await run(signed(event))).status).toBe(200);
    expect(db.container("invoices").docs.get("inv1").status).toBe("paid");
    expect(payment()).toMatchObject({ invoiceNumber: "INV-2026-0042" });
  });

  it("treats a reference that is not a string as no reference", async () => {
    expect((await run(signed(chargeOf({ reference: 12345 })))).status).toBe(200);
    expect(subjects()).toEqual([["admin@example.com", FAILED_SUBJECT]]);
    expect(sent[0].html).toContain("payment has no Paystack reference");
    expect(handlerLog.warn).toHaveBeenCalledWith(
      expect.stringContaining("reference that is not a string"),
    );
    expect(db.container("payments").docs.size).toBe(0);
    expect(db.container("invoices").docs.get("inv1").status).toBe("sent");
  });

  it("cannot read an invoice number from a reference that is not a string", async () => {
    const event = chargeOf({ reference: { id: 1 }, metadata: {} });
    expect((await run(signed(event))).status).toBe(200);
    expect(sent[0].html).toContain("could not determine which invoice");
  });

  it("alerts and answers 200 for a charge without a reference", async () => {
    expect((await run(signed(chargeOf({ reference: "" })))).status).toBe(200);
    expect(sent[0].html).toContain("payment has no Paystack reference");
    expect(db.container("payments").docs.size).toBe(0);
  });

  // The only test in this file with an invalid DATA_BACKEND: the once-per-
  // process flag lives in index.js for the life of the module.
  it("answers 500 to an invalid DATA_BACKEND and mails about it once it is sent", async () => {
    process.env.DATA_BACKEND = "cosmo";
    sent.answers.push(500);
    for (let i = 0; i < 3; i++) expect((await run()).status).toBe(500);
    // The first send fails, so the flag is not set and the next run mails.
    expect(sent.map((m) => [m.subject, m.status])).toEqual([
      ["Action needed: Paystack webhooks are failing and will be retried", 500],
      ["Action needed: Paystack webhooks are failing and will be retried", 200],
    ]);
    const { html } = sent[1];
    expect(html).toContain("DATA_BACKEND is not valid");
    expect(html).toContain("within Paystack&#39;s 72-hour retry window");
    expect(html).toContain("are lost and must be recorded by hand");
    expect(html).toContain("Paystack dashboard");
    expect(html).toContain("function logs");
    expect(html).toContain("sent once while the setting is wrong");
    expect(html).not.toContain("once per payment");
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
    resetUnverifiedAlert();
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

  // The only test in this file with an invalid WRITE_HOLD: the once-per-
  // process flag lives in index.js for the life of the module.
  it("answers 500 to invoice and quote charges under an invalid WRITE_HOLD and mails once", async () => {
    process.env.WRITE_HOLD = "true";
    process.env.DATA_BACKEND = "cosmos";
    const quoteEvent = chargeOf({
      reference: "Q-2026-0001-1-ABCDEFGH",
      metadata: { kind: "quote" },
    });
    expect((await run(signed(chargeOf()))).status).toBe(500);
    expect((await run(signed(quoteEvent))).status).toBe(500);
    expect(sent.map((m) => m.subject)).toEqual([
      "Action needed: WRITE_HOLD has an invalid value; payments are not being recorded",
    ]);
    expect(sent[0].html).toContain("WRITE_HOLD is not valid");
    expect(sent[0].html).toContain("WRITE_HOLD must be");
    expect(quote).not.toHaveBeenCalled();
    expect(cosmos.getDatabase).not.toHaveBeenCalled();
  });

  it("still rejects and reports a bad signature", async () => {
    expect((await run(signed(chargeOf(), "sk_test_other"))).status).toBe(200);
    expect(sent.map((m) => m.subject)).toEqual([
      "Action needed: a Paystack webhook was not processed",
    ]);
  });
});
