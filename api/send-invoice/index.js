/* global require, module, Buffer */
// POST /api/send-invoice (admin) — emails a saved one-off invoice to its
// client. The body names the invoice; the email is built from the saved row,
// so it goes to the client email on the record, which is where the access
// code for its pay page goes too. With the invoice access gate on, the pay
// link carries a one-time link code (#k=) so it opens at once.
// Design: docs/plans/2026-10-25-invoice-receipt-access-codes.md (8.4).
const https = require("https");
const { requireAdmin } = require("../shared/adminAuth");
const { invoicePayPath } = require("../shared/invoiceLinks");
const { getDatabase } = require("../shared/cosmos");
const { createCosmosLocks } = require("../shared/locks");
const { createCosmosInvoiceStore } = require("../shared/invoices/store.cosmos");
const { invoiceAccess } = require("../shared/invoices/access");
const { normalEmail } = require("../shared/access/core");
const { redact } = require("../shared/access/endpoint");
const { HttpError } = require("../shared/http");
const { withDeadline } = require("../shared/deadline");
const {
  C,
  esc,
  multiline,
  shell,
  heading,
  card,
  button,
  buttons,
  small,
  money: formatMoney,
} = require("../shared/email/ui");

const CORS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
  "Content-Type": "application/json",
};

const CLIENT_REASON = "OceanicCoder · Web and app development";
const CONTACT = "hello@oceaniccoder.dev";
const LABEL = "font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase";
const NUM = "font-variant-numeric:tabular-nums;white-space:nowrap";

function formatDate(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// The kit's button() only allows https links, so the mailto reply button is
// built here with the same secondary styling.
function mailtoButton(label) {
  return `<a href="mailto:${CONTACT}" style="display:inline-block;background:#ffffff;color:${C.tealDark};border:1px solid ${C.line};border-radius:10px;padding:12px 22px;font-size:15px;font-weight:600;text-decoration:none;margin:0 8px 8px 0">${esc(label)}</a>`;
}

function party(title, name, details) {
  return `<div style="${LABEL};color:${C.ink3};margin:0 0 8px">${esc(title)}</div><div style="font-size:15px;font-weight:700;color:${C.ink}">${esc(name)}</div>${details
    .filter(Boolean)
    .map((d) => `<div style="font-size:14px;color:${C.ink3}">${esc(d)}</div>`)
    .join("")}`;
}

function parties({ clientName, clientEmail, clientPhone }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr>
<td width="50%" style="vertical-align:top;padding:0 12px 0 0">${party("From", "Illona Addae", ["OceanicCoder", "oceaniccoder.dev"])}</td>
<td width="50%" style="vertical-align:top;padding:0 0 0 12px;border-left:1px solid ${C.line}">${party("Billed to", clientName, [clientEmail, clientPhone])}</td>
</tr></table>`;
}

function itemsTable({ items, money, subtotal, tax, taxRate, total }) {
  const th = (label, align) =>
    `<th align="${align}" style="padding:0 0 10px;${LABEL};color:${C.ink3};text-align:${align}">${label}</th>`;
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:12px 8px 12px 0;border-top:1px solid ${C.line};font-size:14px;color:${C.ink}">${esc(i.description)}</td><td align="center" style="padding:12px 8px;border-top:1px solid ${C.line};font-size:14px;color:${C.ink2};${NUM}">${esc(i.quantity)}</td><td align="right" style="padding:12px 8px;border-top:1px solid ${C.line};font-size:14px;color:${C.ink2};${NUM}">${esc(money(i.unitPrice))}</td><td align="right" style="padding:12px 0 12px 8px;border-top:1px solid ${C.line};font-size:14px;font-weight:600;color:${C.ink};${NUM}">${esc(money(i.quantity * i.unitPrice))}</td></tr>`,
    )
    .join("");
  const sum = (label, value, strong) =>
    `<tr><td colspan="3" align="right" style="padding:${strong ? "12px" : "8px"} 8px ${strong ? "4px" : "0"} 0;${strong ? `border-top:1px solid ${C.line};font-size:16px;font-weight:700;color:${C.ink}` : `font-size:14px;color:${C.ink3}`}">${esc(label)}</td><td align="right" style="padding:${strong ? "12px" : "8px"} 0 ${strong ? "4px" : "0"} 8px;${strong ? `border-top:1px solid ${C.line};font-size:16px;font-weight:700;color:${C.tealDark}` : `font-size:14px;color:${C.ink2}`};${NUM}">${esc(value)}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px">
<tr>${th("Description", "left")}${th("Qty", "center")}${th("Unit price", "right")}${th("Total", "right")}</tr>
${rows}
${sum("Subtotal", money(subtotal))}
${taxRate > 0 ? sum(`Tax (${taxRate}%)`, money(tax)) : ""}
${sum("Total", money(total), true)}
</table>`;
}

function notesBlock(notes) {
  return `<div style="border-top:1px solid ${C.line};padding:16px 0 0;margin:0 0 24px"><div style="${LABEL};color:${C.ink3};margin:0 0 8px">Notes</div><div style="font-size:14px;color:${C.ink2}">${multiline(notes)}</div></div>`;
}

const OPENS_NOTE =
  "This link usually opens straight away. If you open it on another device, we'll email you a short code first.";

// Pure: builds the invoice email HTML from the invoice fields. The pay link is
// signed, so it throws when `secret` is missing. linkCode, when given, goes in
// the link's fragment and the email says the link opens straight away.
function renderInvoiceEmail(
  d,
  now = new Date(),
  secret = process.env.RECEIPT_SIGNING_SECRET,
  { linkCode = null } = {},
) {
  const money = (n) => formatMoney(n, d.currency);
  const items = d.items || [];
  // Older callers sent items only; work the sums out rather than print NaN.
  const num = (v, fallback) =>
    Number.isFinite(Number(v)) && v !== "" && v !== null && v !== undefined ? Number(v) : fallback;
  const subtotal = num(
    d.subtotal,
    items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
  );
  const tax = num(d.tax, 0);
  d = { ...d, subtotal, tax, total: num(d.total, subtotal + tax) };
  const issuedDate = formatDate(now);
  const dueDate = d.dueDate ? formatDate(new Date(d.dueDate)) : null;
  const delivery = d.estimatedDelivery ? formatDate(new Date(d.estimatedDelivery)) : null;
  const amountDue = money(d.total);
  // The fragment goes last, after the query, and never reaches a server.
  const payLink = `https://oceaniccoder.dev${invoicePayPath(d.invoiceNumber, secret)}${
    linkCode ? `#k=${linkCode}` : ""
  }`;

  return shell({
    preview: `Invoice ${d.invoiceNumber}: ${amountDue}${dueDate ? `, due ${dueDate}` : ""}`,
    meta: { label: "Invoice", number: d.invoiceNumber },
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Invoice",
        title: "Your invoice from OceanicCoder",
        intro: `Hi ${d.clientName}, here is invoice ${d.invoiceNumber}, issued ${issuedDate}.`,
      }) +
      card({
        title: "Amount due",
        status: { label: "Due", tone: "warn" },
        highlight: amountDue,
        rows: [
          ["Issued", issuedDate],
          ["Payment due", dueDate],
          ["Estimated delivery", delivery],
        ],
      }) +
      parties(d) +
      itemsTable({ ...d, items, money }) +
      (d.notes ? notesBlock(d.notes) : "") +
      buttons(button({ href: payLink, label: "Pay now" }), mailtoButton("Reply to this invoice")) +
      small(
        [linkCode ? OPENS_NOTE : "", "Have questions about this invoice? Get in touch."]
          .filter(Boolean)
          .join("\n\n"),
      ),
  });
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(data) },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: raw }));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function httpsPostForm(hostname, path, headers, params) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams(params).toString();
    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: raw }));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function sendSMS(to, message, log) {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username || !to) return;

  const params = { username, to, message };
  const senderId = process.env.AT_SENDER_ID;
  if (senderId) params.from = senderId;

  try {
    await httpsPostForm(
      "api.africastalking.com",
      "/version1/messaging",
      { apiKey, Accept: "application/json" },
      params,
    );
  } catch (err) {
    if (log) log.warn("SMS failed:", err.message);
  }
}

// The saved row's items are a JSON string (the dashboard writes them so).
// Unreadable items send the email without lines rather than not at all.
function rowItems(row, context) {
  if (Array.isArray(row.items)) return row.items;
  try {
    const parsed = JSON.parse(row.items || "[]");
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Logged below.
  }
  context.log.warn(`send-invoice items unreadable number=${row.invoiceNumber}`);
  return [];
}

// The row keeps the tax amount, not the rate. The dashboard rounds the rate
// to a whole percent when it opens a saved invoice; the email keeps two
// decimals, so a 2.5% rate reads as 2.5%, not 3%.
function taxRateOf(row) {
  const subtotal = Number(row.subtotal);
  const tax = Number(row.tax);
  return subtotal > 0 && tax > 0 ? Number(((tax / subtotal) * 100).toFixed(2)) : 0;
}

/** The email's fields, all from the saved row. */
const fromRow = (row, context) => ({
  invoiceNumber: row.invoiceNumber,
  clientName: row.clientName,
  clientEmail: row.clientEmail,
  clientPhone: row.clientPhone,
  items: rowItems(row, context),
  currency: row.currency,
  subtotal: row.subtotal,
  tax: row.tax,
  taxRate: taxRateOf(row),
  total: row.total,
  dueDate: row.dueDate,
  estimatedDelivery: row.estimatedDelivery,
  notes: row.notes,
});

// Answer the dashboard with an error rather than leave it waiting on a
// Cosmos endpoint that accepted the connection and never replied.
const READ_TIMEOUT_MS = 5000;
// The dashboard saves the row through /api/manage just before it calls this,
// and another instance can read from a replica that hasn't caught up yet.
const REREAD_AFTER_MS = 300;

// The total the dashboard saved, when the body says (both sides compute it the same way).
const totalDiffers = (row, total) =>
  typeof total === "number" && Math.abs(Number(row.total) - total) > 0.005;

/**
 * The saved invoice for this number. A missing row, or one whose total isn't
 * the one the dashboard just saved, is read once more after a short wait.
 * Two rows with one number fail closed at once, as on the pay page and
 * doc-access: either could answer a lookup, so its pay link would only ever
 * reach "not valid".
 */
async function loadRow(svc, number, expectedTotal, { context, sleep }) {
  const read = async () => {
    const rows = await withDeadline(READ_TIMEOUT_MS, (abortSignal) =>
      svc.invoices.findInvoicesByNumber(number, { abortSignal }),
    );
    if (rows.length > 1) {
      context.log.warn(`send-invoice duplicate number=${number}`);
      throw new HttpError(
        409,
        `Two invoices share the number ${number}, so its pay link can't open. Nothing was sent.`,
      );
    }
    return rows[0] || null;
  };
  let row = await read();
  if (!row || totalDiffers(row, expectedTotal)) {
    await sleep(REREAD_AFTER_MS);
    row = await read();
  }
  if (!row) throw new HttpError(409, "Save the invoice before sending it.");
  if (totalDiffers(row, expectedTotal)) {
    context.log.warn(`send-invoice total differs number=${number}`);
    throw new HttpError(
      409,
      "The invoice changed while it was being sent, so nothing was sent. Try again.",
    );
  }
  if (!row.clientEmail)
    throw new HttpError(
      409,
      "This invoice has no client email, so it can't be sent. Add one, then send it again.",
    );
  return row;
}

/**
 * The link code for this email, or null while the gate is off. Checks the
 * switch and the secret first (503), so nothing is sent with a link the
 * client couldn't open.
 */
function linkCodeMinter(env, context) {
  const logError = (line) => context.log.error(line);
  if (!invoiceAccess.gateEnabled(env, logError)) return null;
  const secret = invoiceAccess.accessSecret(env, logError);
  return async (svc, row) => {
    const epoch = await invoiceAccess.currentEpoch(svc.locks, row);
    return invoiceAccess.mintLinkCode(secret, row, epoch, svc.now().getTime());
  };
}

function createServices() {
  const db = getDatabase();
  return {
    invoices: createCosmosInvoiceStore(db),
    locks: createCosmosLocks(db),
    now: () => new Date(),
  };
}

const sendWithResend = (apiKey, payload) =>
  httpsPost(
    "api.resend.com",
    "/emails",
    { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    payload,
  );

/**
 * deps: services() gives { invoices: { findInvoicesByNumber }, locks, now };
 * env, requireAdmin, sendEmail(apiKey, payload), sendSms(to, text, log) and
 * sleep(ms) replace the real ones in tests.
 */
function createHandler(deps) {
  const env = deps.env || process.env;
  const checkAdmin = deps.requireAdmin || requireAdmin;
  const sendEmail = deps.sendEmail || sendWithResend;
  const sendSms = deps.sendSms || sendSMS;
  const sleep = deps.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const reply = (context, status, body) => {
    context.res = { status, headers: CORS, body: JSON.stringify(body) };
  };

  return async function (context, req) {
    if (req.method === "OPTIONS") {
      context.res = { status: 204, headers: CORS, body: "" };
      return;
    }

    // Sends email from our domain, so only the signed-in admin (the
    // dashboard) may call it.
    const auth = await checkAdmin(context, req);
    if (!auth.user) return reply(context, auth.status, { error: auth.error });

    const body = req.body || {};
    const number = typeof body.invoiceNumber === "string" ? body.invoiceNumber : "";
    if (!number) return reply(context, 400, { error: "invoiceNumber required" });

    const apiKey = env.RESEND_API_KEY;
    const fromEmail = env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";
    if (!apiKey) return reply(context, 503, { error: "Not configured" });
    // Without the signing secret the email could carry no working pay link.
    if (!env.RECEIPT_SIGNING_SECRET)
      return reply(context, 503, {
        error: "Invoice pay links need RECEIPT_SIGNING_SECRET to be set.",
      });

    try {
      const mint = linkCodeMinter(env, context);
      const svc = deps.services();
      const row = await loadRow(svc, number, body.total, { context, sleep });
      // The dashboard sends the inquiry's address, which can differ from the
      // one saved on the invoice. The row's wins: the pay page's codes go there.
      if (body.clientEmail && normalEmail(body.clientEmail) !== normalEmail(row.clientEmail))
        context.log(`send-invoice recipient from the saved invoice number=${number}`);
      const linkCode = mint ? await mint(svc, row) : null;
      if (linkCode) context.log(`send-invoice linkcode number=${number}`);
      const d = fromRow(row, context);
      const html = renderInvoiceEmail(d, svc.now(), env.RECEIPT_SIGNING_SECRET, { linkCode });

      const result = await sendEmail(apiKey, {
        from: `Illona @ OceanicCoder <${fromEmail}>`,
        to: [d.clientEmail],
        subject: `Invoice ${number} from OceanicCoder`,
        html,
      });
      if (result.status !== 200 && result.status !== 201) {
        context.log.error(
          `Resend invoice error number=${number}: ${result.status} ${redact(result.body)}`,
        );
        return reply(context, 502, { error: "Failed to send invoice" });
      }

      // SMS to client (fire-and-forget)
      if (d.clientPhone) {
        sendSms(
          d.clientPhone,
          `Hi ${d.clientName}, your invoice ${number} for ${formatMoney(d.total, d.currency)} from OceanicCoder has been sent to ${d.clientEmail}.`,
          context.log,
        );
      }
      return reply(context, 200, { success: true });
    } catch (err) {
      if (err instanceof HttpError) return reply(context, err.status, { error: err.message });
      context.log.error("send-invoice error:", redact(err && err.message));
      return reply(context, 500, { error: "Internal error" });
    }
  };
}

module.exports = createHandler({ services: createServices, requireAdmin });
module.exports.createHandler = createHandler;
module.exports.renderInvoiceEmail = renderInvoiceEmail;
