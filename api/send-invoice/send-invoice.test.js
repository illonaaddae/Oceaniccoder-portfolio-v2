// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const { renderInvoiceEmail } = await import("./index.js");
const { verifyInvoice } = await import("../shared/tokens.js");

const SECRET = "test-signing-secret";

const NOW = new Date("2026-10-10T12:00:00.000Z");
const base = {
  invoiceNumber: "INV-2026-0042",
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  clientPhone: "+233200000000",
  items: [
    { description: "Store build", quantity: 2, unitPrice: 1500 },
    { description: "Hosting setup", quantity: 1, unitPrice: 250.5 },
  ],
  currency: "GHS",
  subtotal: 3250.5,
  tax: 162.53,
  taxRate: 5,
  total: 3413.03,
  dueDate: "2026-10-24T12:00:00.000Z",
  estimatedDelivery: "2026-11-15T12:00:00.000Z",
  notes: "Deposit covers design.\nBalance on launch.",
};

describe("renderInvoiceEmail", () => {
  beforeEach(() => {
    process.env.RECEIPT_SIGNING_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.RECEIPT_SIGNING_SECRET;
  });

  it("derives subtotal and total from the items when they are missing", () => {
    const { subtotal: _s, tax: _t, total: _total, ...rest } = base;
    const html = renderInvoiceEmail({ ...rest, taxRate: 0 }, NOW);
    expect(html).not.toContain("NaN");
    expect(html).toContain("GHS 3,250.50");
  });

  it("uses the branded kit shell with the invoice number in the letterhead", () => {
    const html = renderInvoiceEmail(base, NOW);
    expect(html).toContain("Ysabeau Office");
    expect(html).toContain("Oceaniccoder-logo@3x.png");
    expect(html).toContain("INV-2026-0042");
    expect(html).not.toContain("#0a0f1a;padding:40px");
  });

  it("shows the amount due, dates, parties, line items and totals", () => {
    const html = renderInvoiceEmail(base, NOW);
    expect(html).toContain("GHS 3,413.03");
    expect(html).toContain("10 October 2026");
    expect(html).toContain("24 October 2026");
    expect(html).toContain("15 November 2026");
    expect(html).toContain("Illona Addae");
    expect(html).toContain("Kofi Mensah");
    expect(html).toContain("kofi@example.com");
    expect(html).toContain("+233200000000");
    expect(html).toContain("Store build");
    expect(html).toContain("GHS 1,500.00");
    expect(html).toContain("GHS 3,000.00");
    expect(html).toContain("GHS 250.50");
    expect(html).toContain("GHS 3,250.50");
    expect(html).toContain("Tax (5%)");
    expect(html).toContain("GHS 162.53");
    expect(html).toContain("Deposit covers design.<br>Balance on launch.");
  });

  it("links to the signed pay page and the reply address", () => {
    const html = renderInvoiceEmail(base, NOW);
    const sig = html.match(/href="https:\/\/oceaniccoder\.dev\/pay\/INV-2026-0042\?s=([^"]+)"/);
    expect(sig).not.toBeNull();
    expect(verifyInvoice("INV-2026-0042", sig[1], SECRET)).toBe(true);
    expect(html).not.toContain('href="https://oceaniccoder.dev/pay/INV-2026-0042"');
    expect(html).toContain('href="mailto:hello@oceaniccoder.dev"');
  });

  it("refuses to build the email without a signing secret", () => {
    delete process.env.RECEIPT_SIGNING_SECRET;
    expect(() => renderInvoiceEmail(base, NOW)).toThrow(/RECEIPT_SIGNING_SECRET/);
  });

  it("leaves out optional parts that were not given", () => {
    const html = renderInvoiceEmail(
      {
        ...base,
        clientPhone: undefined,
        taxRate: 0,
        dueDate: undefined,
        estimatedDelivery: undefined,
        notes: "",
      },
      NOW,
    );
    expect(html).not.toContain("Tax (");
    expect(html).not.toContain("Payment due");
    expect(html).not.toContain("Estimated delivery");
    expect(html).not.toContain(">Notes<");
    expect(html).not.toContain("+233");
  });

  it("groups thousands and names the currency once", () => {
    const html = renderInvoiceEmail(base, NOW);
    expect(html).not.toContain("₵");
    expect(html).not.toMatch(/\d GHS/);
  });

  it("escapes client-supplied text, including notes", () => {
    const html = renderInvoiceEmail(
      {
        ...base,
        clientName: "<b>Kofi</b>",
        notes: "<script>alert(1)</script>",
        items: [{ description: "<img src=x>", quantity: "1<i>", unitPrice: 10 }],
        invoiceNumber: 'INV"/><x',
      },
      NOW,
    );
    expect(html).not.toContain("<b>Kofi</b>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x>");
    expect(html).not.toContain("1<i>");
    expect(html).not.toContain('INV"/><x');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("https://oceaniccoder.dev/pay/INV%22%2F%3E%3Cx");
  });
});

describe("send-invoice handler configuration", () => {
  // index.js reads requireAdmin when it loads, so stub it and load a fresh copy.
  function loadHandler() {
    const adminAuth = require("../shared/adminAuth.js");
    const real = adminAuth.requireAdmin;
    adminAuth.requireAdmin = async () => ({ user: { $id: "admin" } });
    delete require.cache[require.resolve("./index.js")];
    const handler = require("./index.js");
    adminAuth.requireAdmin = real;
    return handler;
  }

  const send = async (handler) => {
    const context = { res: null, log: Object.assign(() => {}, { error: () => {} }) };
    await handler(context, { method: "POST", headers: {}, body: base });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RECEIPT_SIGNING_SECRET;
  });

  it("names the missing signing secret instead of a generic error", async () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(await send(loadHandler())).toEqual({
      status: 503,
      body: { error: "Invoice pay links need RECEIPT_SIGNING_SECRET to be set." },
    });
  });

  it("still answers Not configured when the Resend key is missing", async () => {
    process.env.RECEIPT_SIGNING_SECRET = SECRET;
    expect(await send(loadHandler())).toEqual({ status: 503, body: { error: "Not configured" } });
  });
});

describe("send-invoice from the saved invoice", () => {
  const { createHandler } = require("./index.js");
  const I = require("../shared/invoices/access.js");
  const { createFakeLocks } = require("../shared/quotes/fakes.js");

  const ACCESS_SECRET = "a".repeat(40);
  const ENV = {
    RESEND_API_KEY: "re_test",
    RECEIPT_SIGNING_SECRET: SECRET,
    QUOTE_ACCESS_SECRET: ACCESS_SECRET,
  };
  const OFF = { ...ENV, INVOICE_ACCESS_GATE: "off" };
  // The row as the dashboard saved it: items as a JSON string, no tax rate.
  const row = {
    id: "inv42",
    invoiceNumber: base.invoiceNumber,
    clientName: "Kofi Mensah",
    clientEmail: "kofi@example.com",
    clientPhone: "+233200000000",
    items: JSON.stringify(base.items),
    currency: "GHS",
    subtotal: 3250.5,
    tax: 162.53,
    total: 3413.03,
    dueDate: base.dueDate,
    estimatedDelivery: base.estimatedDelivery,
    notes: base.notes,
    status: "sent",
  };
  // As escaped in the HTML.
  const OPENS =
    "This link usually opens straight away. If you open it on another device, we&#39;ll email you a short code first.";

  // reads: what each lookup returns in turn (the last repeats), for a
  // replica that hasn't caught up with the dashboard's write yet.
  function setup({
    rows = [row],
    reads = [rows],
    env = ENV,
    mail = { status: 200, body: "{}" },
  } = {}) {
    const locks = createFakeLocks();
    let n = 0;
    const findInvoicesByNumber = vi.fn(async (number) =>
      reads[Math.min(n++, reads.length - 1)].filter((r) => r.invoiceNumber === number),
    );
    const sendEmail = vi.fn(async () => mail);
    const sendSms = vi.fn();
    const sleep = vi.fn(async () => {});
    const handler = createHandler({
      env,
      requireAdmin: async () => ({ user: { $id: "admin" } }),
      services: () => ({ invoices: { findInvoicesByNumber }, locks, now: () => NOW }),
      sendEmail,
      sendSms,
      sleep,
    });
    const send = async (body = base) => {
      const log = Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() });
      const context = { res: null, log };
      await handler(context, { method: "POST", headers: {}, body });
      return { status: context.res.status, body: JSON.parse(context.res.body), log };
    };
    const email = () => sendEmail.mock.calls[0][1];
    return { locks, findInvoicesByNumber, sendEmail, sendSms, sleep, send, email };
  }
  const payHref = (html) =>
    html.match(/href="(https:\/\/oceaniccoder\.dev\/pay\/[^"]+)"/)[1].replace(/&amp;/g, "&");

  it("emails the client on the row, with the row's details, when the body disagrees", async () => {
    const t = setup();
    const r = await t.send({
      ...base,
      clientName: "Someone Else",
      clientEmail: "attacker@example.net",
      clientPhone: "+233999999999",
      items: [{ description: "Cheap thing", quantity: 1, unitPrice: 1 }],
    });
    expect(r).toMatchObject({ status: 200, body: { success: true } });
    expect(t.findInvoicesByNumber).toHaveBeenCalledWith("INV-2026-0042", expect.anything());
    const mail = t.email();
    expect(mail.to).toEqual(["kofi@example.com"]);
    expect(mail.html).toContain("Kofi Mensah");
    expect(mail.html).toContain("GHS 3,413.03");
    expect(mail.html).toContain("Store build");
    expect(mail.html).toContain("Tax (5%)");
    expect(mail.html).not.toContain("Someone Else");
    expect(mail.html).not.toContain("attacker@example.net");
    expect(mail.html).not.toContain("Cheap thing");
    expect(t.sendSms).toHaveBeenCalledWith(
      "+233200000000",
      expect.stringContaining("Kofi Mensah"),
      expect.anything(),
    );
    // Logged without either address.
    const logged = JSON.stringify([r.log.mock.calls, r.log.warn.mock.calls]);
    expect(logged).toContain("INV-2026-0042");
    expect(logged).not.toMatch(/@example\./);
  });

  it("needs only the invoice number in the body", async () => {
    const t = setup();
    expect((await t.send({ invoiceNumber: row.invoiceNumber })).status).toBe(200);
    expect(t.email().to).toEqual(["kofi@example.com"]);
    expect((await t.send({ clientEmail: "kofi@example.com" })).status).toBe(400);
  });

  it("puts a link code that opens this invoice in the fragment, after the signature", async () => {
    const t = setup();
    await t.send();
    const href = payHref(t.email().html);
    const m = href.match(/^https:\/\/oceaniccoder\.dev\/pay\/INV-2026-0042\?s=([^#&]+)#k=(.+)$/);
    expect(m).not.toBeNull();
    expect(verifyInvoice("INV-2026-0042", m[1], SECRET)).toBe(true);
    const check = await I.invoiceAccess.checkLinkCode({
      secret: ACCESS_SECRET,
      locks: t.locks,
      record: row,
      linkCode: m[2],
      nowMs: NOW.getTime(),
    });
    expect(check).toMatchObject({ ok: true, epoch: 0 });
    expect(t.email().html).toContain(OPENS);
  });

  it("mints the link code for the current epoch, after a reset", async () => {
    const t = setup();
    await I.invoiceAccess.bumpEpoch(t.locks, row);
    await t.send();
    const code = payHref(t.email().html).split("#k=")[1];
    const check = await I.invoiceAccess.checkLinkCode({
      secret: ACCESS_SECRET,
      locks: t.locks,
      record: row,
      linkCode: code,
      nowMs: NOW.getTime(),
    });
    expect(check).toMatchObject({ ok: true, epoch: 1 });
  });

  it("sends the bare signed link, without the code line, while the switch is off", async () => {
    const t = setup({ env: OFF });
    await t.send();
    expect(payHref(t.email().html)).toMatch(
      /^https:\/\/oceaniccoder\.dev\/pay\/INV-2026-0042\?s=[^#]+$/,
    );
    expect(t.email().html).not.toContain("usually opens straight away");
  });

  it("refuses with 409 before sending when the invoice isn't saved", async () => {
    const t = setup({ rows: [] });
    const r = await t.send();
    expect(r).toEqual({
      status: 409,
      body: { error: "Save the invoice before sending it." },
      log: expect.anything(),
    });
    expect(t.sendEmail).not.toHaveBeenCalled();
  });

  describe("reading the row just after the dashboard wrote it", () => {
    it("reads once more after 300 ms when the new invoice isn't there yet", async () => {
      const t = setup({ reads: [[], [row]] });
      expect((await t.send()).status).toBe(200);
      expect(t.findInvoicesByNumber).toHaveBeenCalledTimes(2);
      expect(t.sleep).toHaveBeenCalledWith(300);
      expect(t.email().to).toEqual(["kofi@example.com"]);
    });

    it("gives up with 409 after that one retry", async () => {
      const t = setup({ reads: [[]] });
      const r = await t.send();
      expect(r).toMatchObject({
        status: 409,
        body: { error: "Save the invoice before sending it." },
      });
      expect(t.findInvoicesByNumber).toHaveBeenCalledTimes(2);
      expect(t.sendEmail).not.toHaveBeenCalled();
    });

    it("reads once more when the saved total isn't the one the dashboard just saved", async () => {
      const t = setup({ reads: [[{ ...row, total: 100 }], [row]] });
      expect((await t.send()).status).toBe(200);
      expect(t.findInvoicesByNumber).toHaveBeenCalledTimes(2);
      expect(t.email().html).toContain("GHS 3,413.03");
    });

    it("refuses with 409 and sends nothing when the total still differs", async () => {
      const t = setup({ reads: [[{ ...row, total: 100 }]] });
      const r = await t.send();
      expect(r.status).toBe(409);
      expect(r.body.error).toBe(
        "The invoice changed while it was being sent, so nothing was sent. Try again.",
      );
      expect(t.sendEmail).not.toHaveBeenCalled();
      expect(r.log.warn).toHaveBeenCalledWith("send-invoice total differs number=INV-2026-0042");
    });

    it("doesn't compare totals when the body has none", async () => {
      const t = setup({ rows: [{ ...row, total: 100 }] });
      expect((await t.send({ invoiceNumber: row.invoiceNumber })).status).toBe(200);
      expect(t.findInvoicesByNumber).toHaveBeenCalledTimes(1);
    });

    it("never retries a number two rows share", async () => {
      const t = setup({ rows: [row, { ...row, id: "inv43" }] });
      expect((await t.send()).status).toBe(409);
      expect(t.findInvoicesByNumber).toHaveBeenCalledTimes(1);
      expect(t.sleep).not.toHaveBeenCalled();
    });

    it("refuses a duplicate that only shows on the retry", async () => {
      const t = setup({ reads: [[], [row, { ...row, id: "inv43" }]] });
      const r = await t.send();
      expect(r.status).toBe(409);
      expect(r.body.error).toMatch(/Two invoices share the number/);
      expect(t.sendEmail).not.toHaveBeenCalled();
    });

    it("answers 500 after 5 s and cancels the read when Cosmos never replies", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        const t = setup();
        t.findInvoicesByNumber.mockImplementation(() => new Promise(() => {}));
        const done = t.send();
        await vi.advanceTimersByTimeAsync(5000);
        const r = await done;
        expect(r).toMatchObject({ status: 500, body: { error: "Internal error" } });
        expect(t.findInvoicesByNumber.mock.calls[0][1].abortSignal.aborted).toBe(true);
        expect(t.sendEmail).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it("warns, naming the number, when the saved items can't be read", async () => {
    const t = setup({ rows: [{ ...row, items: "not json" }] });
    const r = await t.send();
    expect(r.status).toBe(200);
    expect(r.log.warn).toHaveBeenCalledWith("send-invoice items unreadable number=INV-2026-0042");
  });

  it("refuses with 409 when two invoices share the number, and sends nothing", async () => {
    const t = setup({ rows: [row, { ...row, id: "inv43", clientEmail: "other@example.com" }] });
    const r = await t.send();
    expect(r.status).toBe(409);
    expect(r.body.error).toBe(
      "Two invoices share the number INV-2026-0042, so its pay link can't open. Nothing was sent.",
    );
    expect(t.sendEmail).not.toHaveBeenCalled();
    expect(r.log.warn).toHaveBeenCalledWith("send-invoice duplicate number=INV-2026-0042");
  });

  it("refuses with 409 when the saved invoice has no client email", async () => {
    const t = setup({ rows: [{ ...row, clientEmail: "" }] });
    const r = await t.send();
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/no client email/);
    expect(t.sendEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["the access secret is missing", { ...ENV, QUOTE_ACCESS_SECRET: "" }],
    ["the switch holds an unknown value", { ...ENV, INVOICE_ACCESS_GATE: "yes" }],
  ])("answers 503 before any lookup or email when %s", async (_, env) => {
    const t = setup({ env });
    const r = await t.send();
    expect(r).toMatchObject({
      status: 503,
      body: { error: "Invoice links are unavailable right now. Please try again later." },
    });
    expect(t.findInvoicesByNumber).not.toHaveBeenCalled();
    expect(t.sendEmail).not.toHaveBeenCalled();
  });

  it("sends with the switch off even without the access secret", async () => {
    const t = setup({ env: { ...OFF, QUOTE_ACCESS_SECRET: "" } });
    expect((await t.send()).status).toBe(200);
  });

  it("logs Resend's failure without the addresses it quotes", async () => {
    const t = setup({
      mail: { status: 422, body: '{"message":"Invalid `to` field: kofi@example.com"}' },
    });
    const r = await t.send();
    expect(r).toMatchObject({ status: 502, body: { error: "Failed to send invoice" } });
    expect(JSON.stringify(r.log.error.mock.calls)).not.toContain("kofi@example.com");
    expect(t.sendSms).not.toHaveBeenCalled();
  });
});

describe("renderInvoiceEmail link code", () => {
  it("adds the link code after the signature and says how the link opens", () => {
    const html = renderInvoiceEmail(base, NOW, SECRET, { linkCode: "abc.def.ghi" });
    expect(html).toMatch(
      /href="https:\/\/oceaniccoder\.dev\/pay\/INV-2026-0042\?s=[^"#]+#k=abc\.def\.ghi"/,
    );
    expect(html).toContain("This link usually opens straight away.");
  });

  it("leaves both out without a link code", () => {
    const html = renderInvoiceEmail(base, NOW, SECRET);
    expect(html).not.toContain("#k=");
    expect(html).not.toContain("usually opens straight away");
  });
});
