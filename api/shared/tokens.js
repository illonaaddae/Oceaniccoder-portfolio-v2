// Link tokens and signatures for client-facing pages.
//
// A quote link carries a random 256-bit token; only its SHA-256 is stored, so
// a database leak does not hand out working links. Receipts and invoice
// pay links use an HMAC instead: receipts must keep working after the quote
// link rotates, and invoices have no token column to store a hash in.

const crypto = require("crypto");

const TOKEN_RE = /^[A-Za-z0-9_-]{40,60}$/;

function newToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isTokenShape(token) {
  return typeof token === "string" && TOKEN_RE.test(token);
}

function hashIp(ip) {
  return ip ? crypto.createHash("sha256").update(`ip:${ip}`).digest("hex") : "";
}

// One HMAC scheme for every signed link. The purpose prefix keeps a receipt
// signature from opening an invoice pay page and the other way round.
function signLink(purpose, value, secret) {
  if (!secret) throw new Error("RECEIPT_SIGNING_SECRET is not configured");
  return crypto
    .createHmac("sha256", secret)
    .update(`${purpose}:${value}`)
    .digest("base64url")
    .slice(0, 32);
}

function verifyLink(purpose, value, sig, secret) {
  if (!secret || typeof sig !== "string" || sig.length !== 32) return false;
  const expected = Buffer.from(signLink(purpose, value, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

const signReceipt = (reference, secret) => signLink("receipt", reference, secret);
const verifyReceipt = (reference, sig, secret) => verifyLink("receipt", reference, sig, secret);
const signInvoice = (invoiceNumber, secret) => signLink("invoice", invoiceNumber, secret);
const verifyInvoice = (invoiceNumber, sig, secret) =>
  verifyLink("invoice", invoiceNumber, sig, secret);

// Appwrite document ids allow [a-zA-Z0-9._-] and at most 36 characters.
function lockId(key) {
  return `s_${crypto.createHash("sha256").update(key).digest("hex").slice(0, 34)}`;
}

module.exports = {
  newToken,
  hashToken,
  isTokenShape,
  hashIp,
  signReceipt,
  verifyReceipt,
  signInvoice,
  verifyInvoice,
  lockId,
};
