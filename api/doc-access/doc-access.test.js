// @vitest-environment node
// POST /api/doc-access for invoices and receipts. The action matrix itself
// (tries, quotas, blocks, link codes) runs against quotes in api/quote-access
// and against a test kind in shared/access/endpoint.test.js; this covers what
// the two kinds add: the contract, locators, switches, the guessable invoice
// link, isolation between kinds, and receipts sharing their quote's counters.
import { createRequire } from "module";
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const quoteAccessEndpoint = await import("../quote-access/index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const { createFakeCosmos } = await import("../shared/fakeCosmos.js");
const { createCosmosInvoiceStore } = await import("../shared/invoices/store.cosmos.js");
const { hashToken, newToken, signInvoice, signReceipt } = await import("../shared/tokens.js");
// The CommonJS instances the handlers require: each access scheme can be
// created once per process, so a second, imported copy would throw.
const require = createRequire(import.meta.url);
const { invoiceAccess, INVOICE_NOT_FOUND } = require("../shared/invoices/access.js");
const { receiptAccess, RECEIPT_NOT_FOUND } = require("../shared/receipts/access.js");
const { quoteAccess } = require("../shared/quotes/accessScheme.js");

const SECRET = "d".repeat(40);
const LINK_SECRET = "link-signing-secret";
const START = Date.parse("2026-10-26T09:00:00.000Z");
const MIN = 60 * 1000;
const ENV = {
  QUOTE_ACCESS_SECRET: SECRET,
  RECEIPT_SIGNING_SECRET: LINK_SECRET,
  RESEND_TO_EMAIL: "owner@oceaniccoder.dev",
};
const TOKEN = newToken();
const REF = "Q-2026-0007-1-K7Q2X9PL";

const INVOICE = {
  id: "inv-row-1",
  invoiceNumber: "INV-2026-0008",
  clientName: "Ama Owusu",
  clientEmail: "ama.owusu@gmail.com",
  status: "sent",
  createdAt: "2026-10-26T08:00:00.000Z",
};
// Emailed before signed links shipped, so its unsigned link still opens.
const OLD_INVOICE = {
  id: "inv-row-2",
  invoiceNumber: "INV-512345",
  clientName: "Kofi Mensah",
  clientEmail: "kofi.mensah@hotmail.com",
  status: "sent",
  $createdAt: "2026-10-10T08:00:00.000Z",
};
const QUOTE = {
  id: "q7",
  quoteNumber: "Q-2026-0007",
  revision: 2,
  status: "accepted",
  title: "Online store",
  clientName: "Kofi Mensah",
  clientEmail: "kofi.mensah@hotmail.com",
  tokenHash: hashToken(TOKEN),
};
const PAYMENT = {
  id: "p1",
  kind: "quote",
  status: "success",
  quoteId: "q7",
  quoteNumber: "Q-2026-0007",
  paystackReference: REF,
  clientEmail: "someone.else@example.com",
};
const RECEIPT = { quote: QUOTE, payment: PAYMENT };

const INVOICE_BODY = {
  kind: "invoice",
  number: INVOICE.invoiceNumber,
  s: signInvoice(INVOICE.invoiceNumber, LINK_SECRET),
};
// What PR 2's client sends for an unsigned link: s is undefined, so JSON drops it.
const UNSIGNED_BODY = { kind: "invoice", number: OLD_INVOICE.invoiceNumber };
const RECEIPT_BODY = { kind: "receipt", reference: REF, s: signReceipt(REF, LINK_SECRET) };

// The Cookie header a browser would send back for these Set-Cookie headers.
const jar = (...setCookies) => setCookies.map((c) => c.split(";")[0]).join("; ");

function watch(locks, calls) {
  return new Proxy(locks, {
    get: (target, prop) => {
      const value = target[prop];
      if (typeof value !== "function") return value;
      return (...args) => {
        calls(prop, ...args);
        return value.apply(target, args);
      };
    },
  });
}

function setup({ env = ENV, locks = createFakeLocks(), invoices = [INVOICE, OLD_INVOICE] } = {}) {
  const db = createFakeCosmos();
  for (const row of invoices) db.container("invoices").seed(row);
  const repo = createFakeRepo({ quotes: [QUOTE], payments: [PAYMENT] });
  const clock = { ms: START };
  const lockCalls = vi.fn();
  const watched = watch(locks, lockCalls);
  const mails = [];
  const logs = [];
  const sendMail = vi.fn(async (mail) => {
    mails.push(mail);
    return { ok: true };
  });
  const services = () => ({
    repo,
    invoices: createCosmosInvoiceStore(db),
    locks: watched,
    now: () => new Date(clock.ms),
  });
  const deps = { env, send: sendMail, alertWaitMs: 50, services };
  const handlers = {
    doc: createHandler(deps),
    quote: quoteAccessEndpoint.createHandler(deps),
  };
  const run = async (which, body, { cookie, method = "POST", ip = "203.0.113.9" } = {}) => {
    const record =
      (level) =>
      (...args) =>
        logs.push(`${level}: ${args.join(" ")}`);
    const log = Object.assign(record("info"), { error: record("error"), warn: record("warn") });
    const context = { log };
    const headers = { "x-forwarded-for": `${ip}:51234` };
    if (cookie) headers.cookie = cookie;
    await handlers[which](context, { method, body, headers });
    return {
      status: context.res.status,
      body: JSON.parse(context.res.body),
      cookie: context.res.headers["Set-Cookie"],
    };
  };
  const call = (body, opts) => run("doc", body, opts);
  const codeOf = (mail) => mail.subject.match(/^(\d{6}) is your code/)[1];
  return { call, run, locks, clock, mails, logs, lockCalls, sendMail, codeOf };
}

describe("doc-access contract", () => {
  it("only accepts POST", async () => {
    const t = setup();
    const r = await t.call({ ...INVOICE_BODY, action: "status" }, { method: "GET" });
    expect(r).toMatchObject({ status: 405, body: { error: "Use POST." } });
  });

  it("checks the action, then the kind", async () => {
    const t = setup();
    expect(await t.call({ kind: "nope", action: "nope" })).toMatchObject({
      status: 400,
      body: { error: "Unknown action." },
    });
    for (const kind of ["quote", "nope", "__proto__", undefined]) {
      expect(await t.call({ kind, number: "INV-2026-0008", action: "status" })).toMatchObject({
        status: 400,
        body: { error: "Unknown kind." },
      });
    }
    expect(t.lockCalls).not.toHaveBeenCalled();
  });

  it("answers status for a signed invoice with the masked address", async () => {
    const r = await setup().call({ ...INVOICE_BODY, action: "status" });
    expect(r).toEqual({
      status: 200,
      body: { locked: true, canUnlock: true, blocked: false, maskedEmail: "a•••••@gmail.com" },
      cookie: undefined,
    });
  });
});

describe("doc-access locator failures", () => {
  const sig = (n) => signInvoice(n, LINK_SECRET);
  const INVOICE_CAUSES = [
    ["a wrong signature", { number: INVOICE.invoiceNumber, s: sig("INV-2026-0009") }],
    ["a malformed signature", { number: INVOICE.invoiceNumber, s: "short" }],
    ["no number", { s: sig(INVOICE.invoiceNumber) }],
    ["an unknown number", { number: "INV-2026-0404", s: sig("INV-2026-0404") }],
    ["an unsigned server-numbered invoice", { number: INVOICE.invoiceNumber }],
    ["an unsigned unknown number", { number: "INV-500000" }],
  ];
  const RECEIPT_CAUSES = [
    ["no signature", { reference: REF }],
    ["a wrong signature", { reference: REF, s: signReceipt("OTHER", LINK_SECRET) }],
    ["an unknown reference", { reference: "R-404", s: signReceipt("R-404", LINK_SECRET) }],
  ];
  const ACTIONS = [
    { action: "status" },
    { action: "send" },
    { action: "verify", challenge: "v1.x.y", code: "123456" },
    { action: "claim", linkCode: "x" },
  ];

  it.each(INVOICE_CAUSES)(
    "answers one 404 for an invoice with %s, before any lock or email",
    async (_name, locator) => {
      for (const action of ACTIONS) {
        const t = setup();
        const r = await t.call({ kind: "invoice", ...locator, ...action });
        expect(r).toEqual({
          status: 404,
          body: { error: INVOICE_NOT_FOUND, inactive: true },
          cookie: undefined,
        });
        expect(t.lockCalls).not.toHaveBeenCalled();
        expect(t.sendMail).not.toHaveBeenCalled();
      }
    },
  );

  it.each(RECEIPT_CAUSES)(
    "answers one 404 for a receipt with %s, before any lock or email",
    async (_name, locator) => {
      for (const action of ACTIONS) {
        const t = setup();
        const r = await t.call({ kind: "receipt", ...locator, ...action });
        expect(r).toEqual({
          status: 404,
          body: { error: RECEIPT_NOT_FOUND, inactive: true },
          cookie: undefined,
        });
        expect(t.lockCalls).not.toHaveBeenCalled();
        expect(t.sendMail).not.toHaveBeenCalled();
      }
    },
  );
});

describe("doc-access switches", () => {
  it("turns each kind off on its own switch", async () => {
    const t = setup({ env: { ...ENV, INVOICE_ACCESS_GATE: "off" } });
    expect((await t.call({ ...INVOICE_BODY, action: "status" })).body).toEqual({
      locked: false,
      gateOff: true,
    });
    expect(await t.call({ ...INVOICE_BODY, action: "send" })).toMatchObject({
      status: 409,
      body: { error: "This invoice opens without a code right now.", gateOff: true },
    });
    expect((await t.call({ ...RECEIPT_BODY, action: "status" })).body.locked).toBe(true);

    const r = setup({ env: { ...ENV, RECEIPT_ACCESS_GATE: "off" } });
    expect((await r.call({ ...RECEIPT_BODY, action: "status" })).body).toEqual({
      locked: false,
      gateOff: true,
    });
    expect((await r.call({ ...INVOICE_BODY, action: "status" })).body.locked).toBe(true);
  });

  it("answers 503 for a switch that is neither on nor off, and logs it", async () => {
    const t = setup({ env: { ...ENV, INVOICE_ACCESS_GATE: "true" } });
    expect(await t.call({ ...INVOICE_BODY, action: "status" })).toMatchObject({
      status: 503,
      body: { error: "Invoice links are unavailable right now. Please try again later." },
    });
    expect(t.logs).toContain('error: invoice-access: INVOICE_ACCESS_GATE must be "on" or "off"');
    expect(t.lockCalls).not.toHaveBeenCalled();
  });

  it("fails closed without the access secret", async () => {
    const t = setup({ env: { RECEIPT_SIGNING_SECRET: LINK_SECRET } });
    expect(await t.call({ ...RECEIPT_BODY, action: "send" })).toMatchObject({
      status: 503,
      body: { error: "Receipt links are unavailable right now. Please try again later." },
    });
    expect(t.sendMail).not.toHaveBeenCalled();
  });
});

describe("doc-access for an invoice", () => {
  it("emails a code to the row's address and verifies it into an invoice cookie", async () => {
    const t = setup();
    const sent = await t.call({ ...INVOICE_BODY, action: "send" });
    expect(sent.status).toBe(200);
    expect(sent.body.maskedEmail).toBe("a•••••@gmail.com");
    expect(t.mails[0].to).toBe("ama.owusu@gmail.com");
    const code = t.codeOf(t.mails[0]);
    expect(t.mails[0].subject).toBe(`${code} is your code for invoice INV-2026-0008`);
    const r = await t.call({
      ...INVOICE_BODY,
      action: "verify",
      challenge: sent.body.challenge,
      code,
    });
    expect(r.status).toBe(200);
    expect(r.cookie).toMatch(/^__Secure-oc_ia_[0-9a-f]{16}=v1\./);
    expect(
      (await t.call({ ...INVOICE_BODY, action: "status" }, { cookie: jar(r.cookie) })).body,
    ).toEqual({ locked: false, canUnlock: true, blocked: false, maskedEmail: "a•••••@gmail.com" });
    expect(t.logs).toEqual([
      "info: doc-access send invoice=INV-2026-0008",
      "info: doc-access verify ok invoice=INV-2026-0008",
    ]);
  });

  it("claims an invoice link code once", async () => {
    const t = setup();
    const linkCode = invoiceAccess.mintLinkCode(SECRET, INVOICE, 0, START);
    const r = await t.call({ ...INVOICE_BODY, action: "claim", linkCode });
    expect(r.status).toBe(200);
    expect(r.cookie).toMatch(/^__Secure-oc_ia_/);
    expect(await t.call({ ...INVOICE_BODY, action: "claim", linkCode })).toMatchObject({
      status: 409,
      body: { codeNeeded: true },
    });
  });

  it("says when the row has no address", async () => {
    const t = setup({ invoices: [{ ...INVOICE, clientEmail: "" }] });
    expect((await t.call({ ...INVOICE_BODY, action: "status" })).body).toMatchObject({
      canUnlock: false,
      maskedEmail: null,
    });
    expect(await t.call({ ...INVOICE_BODY, action: "send" })).toMatchObject({
      status: 409,
      body: { noEmail: true },
    });
  });
});

describe("doc-access for an unsigned invoice link", () => {
  it("hides the address on status and on send, and still offers a code", async () => {
    const t = setup();
    expect((await t.call({ ...UNSIGNED_BODY, action: "status" })).body).toEqual({
      locked: true,
      canUnlock: true,
      blocked: false,
      maskedEmail: null,
    });
    const sent = await t.call({ ...UNSIGNED_BODY, action: "send" });
    expect(sent.status).toBe(200);
    expect(sent.body.maskedEmail).toBeNull();
    expect(JSON.stringify(sent.body)).not.toContain("hotmail");
    expect(t.mails[0].to).toBe("kofi.mensah@hotmail.com");
  });

  it("sends at most one code per 10 minutes and three a day", async () => {
    const t = setup();
    // A new IP each time, so the per-IP limit isn't what refuses.
    let n = 0;
    const send = async () =>
      (await t.call({ ...UNSIGNED_BODY, action: "send" }, { ip: `198.51.100.${(n += 1)}` })).status;
    expect(await send()).toBe(200);
    t.clock.ms += 2 * MIN;
    expect(await send()).toBe(429);
    t.clock.ms += 13 * MIN;
    expect(await send()).toBe(200);
    t.clock.ms += 15 * MIN;
    expect(await send()).toBe(200);
    t.clock.ms += 15 * MIN;
    const fourth = await t.call({ ...UNSIGNED_BODY, action: "send" }, { ip: "198.51.100.99" });
    expect(fourth.status).toBe(429);
    expect(fourth.body.retryAfterSeconds).toBe(14 * 3600 + 15 * 60);
    expect(t.mails).toHaveLength(3);
  });

  it("verifies a code sent through the unsigned link", async () => {
    const t = setup();
    const sent = await t.call({ ...UNSIGNED_BODY, action: "send" });
    const code = t.codeOf(t.mails[0]);
    const r = await t.call({
      ...UNSIGNED_BODY,
      action: "verify",
      challenge: sent.body.challenge,
      code,
    });
    expect(r.status).toBe(200);
    expect(r.cookie).toMatch(/^__Secure-oc_ia_/);
  });
});

describe("doc-access wrong codes on an unsigned invoice link", () => {
  const SIGNED_OLD = {
    ...UNSIGNED_BODY,
    s: signInvoice(OLD_INVOICE.invoiceNumber, LINK_SECRET),
  };
  const wrongCode = (code) => String((Number(code) + 1) % 1000000).padStart(6, "0");

  // Three unsigned sends, five wrong codes after each: fifteen misses, which
  // anyone who guesses an old invoice number can do.
  async function guessFifteenTimes(t) {
    let last;
    for (let round = 0; round < 3; round += 1) {
      const ip = `198.51.100.${10 + round}`;
      const sent = await t.call({ ...UNSIGNED_BODY, action: "send" }, { ip });
      expect(sent.status).toBe(200);
      const wrong = wrongCode(t.codeOf(t.mails[t.mails.length - 1]));
      for (let i = 0; i < 5; i += 1) {
        last = await t.call(
          { ...UNSIGNED_BODY, action: "verify", challenge: sent.body.challenge, code: wrong },
          { ip },
        );
      }
      t.clock.ms += 16 * MIN;
    }
    return last;
  }

  it("blocks the unsigned link after fifteen", async () => {
    const t = setup();
    expect(await guessFifteenTimes(t)).toMatchObject({ status: 403, body: { blocked: true } });
    expect((await t.call({ ...UNSIGNED_BODY, action: "status" })).body).toMatchObject({
      blocked: true,
      canUnlock: false,
    });
    expect((await t.call({ ...UNSIGNED_BODY, action: "send" })).status).toBe(403);
  });

  it("never blocks the signed link the client was emailed", async () => {
    const t = setup();
    await guessFifteenTimes(t);
    const ip = "203.0.113.5";
    expect((await t.call({ ...SIGNED_OLD, action: "status" }, { ip })).body).toEqual({
      locked: true,
      canUnlock: true,
      blocked: false,
      maskedEmail: "k•••••@hotmail.com",
    });
    const sent = await t.call({ ...SIGNED_OLD, action: "send" }, { ip });
    expect(sent.status).toBe(200);
    const code = t.codeOf(t.mails[t.mails.length - 1]);
    const r = await t.call(
      { ...SIGNED_OLD, action: "verify", challenge: sent.body.challenge, code },
      { ip },
    );
    expect(r.status).toBe(200);
    expect(r.cookie).toMatch(/^__Secure-oc_ia_/);
  });

  it("still blocks both links after fifteen wrong codes on the signed one", async () => {
    const t = setup();
    for (let i = 0; i < 14; i += 1) await invoiceAccess.recordMiss(t.locks, OLD_INVOICE, 0);
    const sent = await t.call({ ...SIGNED_OLD, action: "send" });
    const wrong = wrongCode(t.codeOf(t.mails[0]));
    const r = await t.call({
      ...SIGNED_OLD,
      action: "verify",
      challenge: sent.body.challenge,
      code: wrong,
    });
    expect(r).toMatchObject({ status: 403, body: { blocked: true } });
    t.clock.ms += 16 * MIN;
    expect((await t.call({ ...SIGNED_OLD, action: "send" })).status).toBe(403);
    expect((await t.call({ ...UNSIGNED_BODY, action: "send" })).status).toBe(403);
    expect((await t.call({ ...UNSIGNED_BODY, action: "status" })).body.blocked).toBe(true);
  });
});

describe("doc-access for a receipt", () => {
  it("sends the code to the quote's client email, not the payer's", async () => {
    const t = setup();
    const r = await t.call({ ...RECEIPT_BODY, action: "send" });
    expect(r.status).toBe(200);
    expect(r.body.maskedEmail).toBe("k•••••@hotmail.com");
    expect(t.mails[0].to).toBe("kofi.mensah@hotmail.com");
    expect(t.mails[0].subject).toMatch(/^\d{6} is your code for your receipt$/);
    expect(t.logs).toEqual([`info: doc-access send receipt=${REF}`]);
  });

  it("shares the quote's send quota", async () => {
    const t = setup();
    expect((await t.call({ ...RECEIPT_BODY, action: "send" })).status).toBe(200);
    const quote = await t.run("quote", { action: "send", token: TOKEN }, { ip: "198.51.100.2" });
    expect(quote).toMatchObject({ status: 429, body: { retryAfterSeconds: 90 } });
    t.clock.ms += 90 * 1000;
    expect((await t.run("quote", { action: "send", token: TOKEN })).status).toBe(200);
    const receipt = await t.call({ ...RECEIPT_BODY, action: "send" }, { ip: "198.51.100.3" });
    expect(receipt.status).toBe(429);
  });

  it("shares the quote's wrong-code count, and alerts with the quote's alert", async () => {
    const t = setup();
    // Fourteen wrong codes on the quote page...
    for (let i = 0; i < 14; i += 1) await quoteAccess.recordMiss(t.locks, QUOTE, 0);
    // ...and the fifteenth on the receipt blocks both.
    const sent = await t.call({ ...RECEIPT_BODY, action: "send" });
    const wrong = String((Number(t.codeOf(t.mails[0])) + 1) % 1000000).padStart(6, "0");
    const r = await t.call({
      ...RECEIPT_BODY,
      action: "verify",
      challenge: sent.body.challenge,
      code: wrong,
    });
    expect(r).toMatchObject({ status: 403, body: { blocked: true } });
    const alert = t.mails[t.mails.length - 1];
    expect(alert.to).toBe("owner@oceaniccoder.dev");
    expect(alert.subject).toBe("Codes blocked after 15 wrong tries on Q-2026-0007");
    expect(alert.text).toContain(`receipt ${REF}`);
    expect((await t.run("quote", { action: "status", token: TOKEN })).body).toMatchObject({
      blocked: true,
      canUnlock: false,
    });
  });

  it("a receipt unlock opens only that receipt, never the quote", async () => {
    const t = setup();
    const linkCode = receiptAccess.mintLinkCode(SECRET, RECEIPT, 0, START);
    const claimed = await t.call({ ...RECEIPT_BODY, action: "claim", linkCode });
    expect(claimed.status).toBe(200);
    expect(claimed.cookie).toMatch(/^__Secure-oc_ra_/);
    const opts = { cookie: jar(claimed.cookie) };
    expect((await t.call({ ...RECEIPT_BODY, action: "status" }, opts)).body.locked).toBe(false);
    expect((await t.run("quote", { action: "status", token: TOKEN }, opts)).body.locked).toBe(true);
  });
});

describe("doc-access isolation between kinds", () => {
  it("a quote link code or cookie fails on an invoice and a receipt", async () => {
    const t = setup();
    const quoteCode = quoteAccess.mintLinkCode(SECRET, QUOTE, 0, START);
    for (const body of [INVOICE_BODY, RECEIPT_BODY]) {
      expect(await t.call({ ...body, action: "claim", linkCode: quoteCode })).toMatchObject({
        status: 400,
        body: { codeNeeded: true },
      });
    }
    const quoteClaim = await t.run("quote", { action: "claim", token: TOKEN, linkCode: quoteCode });
    expect(quoteClaim.status).toBe(200);
    const opts = { cookie: jar(quoteClaim.cookie) };
    expect((await t.call({ ...INVOICE_BODY, action: "status" }, opts)).body.locked).toBe(true);
    expect((await t.call({ ...RECEIPT_BODY, action: "status" }, opts)).body.locked).toBe(true);
  });

  it("an invoice or receipt link code fails as another kind, and on quote-access", async () => {
    const t = setup();
    const invoiceCode = invoiceAccess.mintLinkCode(SECRET, INVOICE, 0, START);
    const receiptCode = receiptAccess.mintLinkCode(SECRET, RECEIPT, 0, START);
    const refused = { status: 400, body: { codeNeeded: true } };
    expect(await t.call({ ...RECEIPT_BODY, action: "claim", linkCode: invoiceCode })).toMatchObject(
      refused,
    );
    expect(await t.call({ ...INVOICE_BODY, action: "claim", linkCode: receiptCode })).toMatchObject(
      refused,
    );
    for (const linkCode of [invoiceCode, receiptCode]) {
      expect(await t.run("quote", { action: "claim", token: TOKEN, linkCode })).toMatchObject(
        refused,
      );
    }
  });

  it("an invoice or receipt cookie never opens another kind", async () => {
    const t = setup();
    const invoiceCookie = (
      await t.call({
        ...INVOICE_BODY,
        action: "claim",
        linkCode: invoiceAccess.mintLinkCode(SECRET, INVOICE, 0, START),
      })
    ).cookie;
    const receiptCookie = (
      await t.call({
        ...RECEIPT_BODY,
        action: "claim",
        linkCode: receiptAccess.mintLinkCode(SECRET, RECEIPT, 0, START),
      })
    ).cookie;
    const status = async (which, body, cookie) =>
      (await t.run(which, { ...body, action: "status" }, { cookie })).body.locked;
    expect(await status("doc", INVOICE_BODY, jar(receiptCookie))).toBe(true);
    expect(await status("doc", RECEIPT_BODY, jar(invoiceCookie))).toBe(true);
    expect(await status("quote", { token: TOKEN }, jar(invoiceCookie, receiptCookie))).toBe(true);
    // Each still opens its own document.
    expect(await status("doc", INVOICE_BODY, jar(invoiceCookie, receiptCookie))).toBe(false);
    expect(await status("doc", RECEIPT_BODY, jar(invoiceCookie, receiptCookie))).toBe(false);
  });
});
