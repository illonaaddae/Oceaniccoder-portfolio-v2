// Link tokens and signatures for client-facing pages.
//
// A quote link carries a random 256-bit token; only its SHA-256 is stored, so
// a database leak does not hand out working links. Receipts use an HMAC
// instead, because they must keep working after the quote link rotates.

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

function signReceipt(reference, secret) {
  if (!secret) throw new Error("RECEIPT_SIGNING_SECRET is not configured");
  return crypto
    .createHmac("sha256", secret)
    .update(`receipt:${reference}`)
    .digest("base64url")
    .slice(0, 32);
}

function verifyReceipt(reference, sig, secret) {
  if (!secret || typeof sig !== "string" || sig.length !== 32) return false;
  const expected = Buffer.from(signReceipt(reference, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Appwrite document ids allow [a-zA-Z0-9._-] and at most 36 characters.
function lockId(key) {
  return `s_${crypto.createHash("sha256").update(key).digest("hex").slice(0, 34)}`;
}

module.exports = { newToken, hashToken, isTokenShape, hashIp, signReceipt, verifyReceipt, lockId };
