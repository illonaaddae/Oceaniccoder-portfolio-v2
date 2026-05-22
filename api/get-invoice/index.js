// GET /api/get-invoice?number=INV-123456
// Fetches invoice by invoice number for public access (no auth required).
// Uses APPWRITE_API_KEY env var — set this in Azure Portal > Configuration.

const sdk = require("node-appwrite");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = "6943431e00253c8f9883";
const DATABASE_ID = "6943493400018e7c314c";
const COLLECTION_ID = "invoices";

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
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

  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    context.res = {
      status: 503,
      headers: CORS,
      body: JSON.stringify({ error: "Server not configured" }),
    };
    return;
  }

  try {
    const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey);

    const db = new sdk.Databases(client);

    const result = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
      sdk.Query.equal("invoiceNumber", [number]),
    ]);

    if (!result.documents || result.documents.length === 0) {
      context.res = {
        status: 404,
        headers: CORS,
        body: JSON.stringify({ error: "Invoice not found" }),
      };
      return;
    }

    const doc = result.documents[0];

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
