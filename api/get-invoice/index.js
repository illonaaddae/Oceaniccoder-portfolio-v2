// GET /api/get-invoice?number=INV-123456&s=<signature>
// Fetches an invoice for its pay page. Needs the signature from the emailed or
// admin pay link; until 2026-11-21 an unsigned link still opens an old unpaid
// invoice (api/shared/invoiceLinks.js).
// DATA_BACKEND picks the store (see ../shared/backend.js). The Appwrite path
// uses APPWRITE_API_KEY — set this in Azure Portal > Configuration.

const sdk = require("node-appwrite");
const cosmos = require("../shared/cosmos");
const { dataBackend } = require("../shared/backend");

const { canOpenInvoice, hasSignature, unsignedGraceCovers } = require("../shared/invoiceLinks");
const { createRateLimiter } = require("../shared/rateLimit");
const { clientIp } = require("../shared/turnstile");

// Only our own pages call this, and the answer holds a client's details, so
// no other origin may read it and no cache may keep it.
const CORS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

// One reply for a bad signature, an unsigned link out of grace and an unknown
// number, so a guess learns nothing about which invoices exist.
const NOT_FOUND = JSON.stringify({
  error: "This payment link is not valid. Ask us for a new one at hello@oceaniccoder.dev.",
});

// Per instance. A client opens their pay page a handful of times; this caps
// anyone trying invoice numbers in bulk.
const allowFromIp = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000 });

const ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = "6943431e00253c8f9883";
const DATABASE_ID = "6943493400018e7c314c";
const COLLECTION_ID = "invoices";

async function findInAppwrite(apiKey, number) {
  const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey);

  const db = new sdk.Databases(client);

  const result = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
    sdk.Query.equal("invoiceNumber", [number]),
  ]);
  return (result.documents && result.documents[0]) || null;
}

async function findInCosmos(number) {
  const { resources } = await cosmos
    .getDatabase()
    .container(COLLECTION_ID)
    .items.query({
      query: "SELECT TOP 1 * FROM c WHERE c.invoiceNumber = @number",
      parameters: [{ name: "@number", value: number }],
    })
    .fetchAll();
  return resources[0] || null;
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  if (!allowFromIp(clientIp(req) || "unknown", 1, Date.now())) {
    context.res = {
      status: 429,
      headers: CORS,
      body: JSON.stringify({ error: "Too many requests. Try again in a few minutes." }),
    };
    return;
  }

  const number = (req.query && req.query.number) || "";

  if (!number) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Missing invoice number" }),
    };
    return;
  }

  // Same answer as an unknown number, before any lookup, so a guessed number
  // learns nothing about whether that invoice exists.
  if (!canOpenInvoice(number, req.query.s, process.env.RECEIPT_SIGNING_SECRET)) {
    context.res = { status: 404, headers: CORS, body: NOT_FOUND };
    return;
  }

  const onCosmos = dataBackend() === "cosmos";
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!onCosmos && !apiKey) {
    context.res = {
      status: 503,
      headers: CORS,
      body: JSON.stringify({ error: "Server not configured" }),
    };
    return;
  }

  try {
    const doc = onCosmos ? await findInCosmos(number) : await findInAppwrite(apiKey, number);

    if (!doc) {
      context.res = { status: 404, headers: CORS, body: NOT_FOUND };
      return;
    }

    // The check above let an unsigned link through on the date alone.
    if (!hasSignature(req.query.s) && !unsignedGraceCovers(doc)) {
      context.res = { status: 404, headers: CORS, body: NOT_FOUND };
      return;
    }

    // Return only safe, public-facing fields — no phone (PII not needed for payment)
    const safe = {
      invoiceNumber: doc.invoiceNumber,
      clientName: doc.clientName,
      clientEmail: doc.clientEmail,
      total: doc.total,
      currency: doc.currency,
      status: doc.status,
      dueDate: doc.dueDate || null,
      estimatedDelivery: doc.estimatedDelivery || null,
    };

    context.res = {
      status: 200,
      headers: CORS,
      body: JSON.stringify(safe),
    };
  } catch (err) {
    context.log.error("get-invoice error:", err.message);
    context.res = {
      status: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Internal error" }),
    };
  }
};
