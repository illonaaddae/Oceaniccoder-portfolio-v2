// Paystack REST calls made with the secret key. The amount always comes from
// the server; the browser only ever receives the access code.

const BASE = "https://api.paystack.co";

async function call(path, { method = "GET", body } = {}) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    throw Object.assign(new Error(json.message || `Paystack ${res.status}`), {
      status: res.status,
    });
  }
  return json.data;
}

async function initializeTransaction({
  email,
  amountMinor,
  currency,
  reference,
  channels,
  callbackUrl,
  metadata,
}) {
  const data = await call("/transaction/initialize", {
    method: "POST",
    body: {
      email,
      amount: amountMinor,
      currency,
      reference,
      channels,
      callback_url: callbackUrl,
      metadata,
    },
  });
  return {
    accessCode: data.access_code,
    authorizationUrl: data.authorization_url,
    reference: data.reference,
  };
}

function verifyTransaction(reference) {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`);
}

module.exports = { initializeTransaction, verifyTransaction };
