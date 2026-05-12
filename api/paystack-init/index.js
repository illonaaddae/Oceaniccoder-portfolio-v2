// POST /api/paystack-init
// Initializes a Paystack transaction and returns an authorization URL.
// Uses PAYSTACK_SECRET_KEY env var — set this in Azure Portal > Configuration.
// Body: { invoiceNumber, email, amount, currency }

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

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

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  const { invoiceNumber, email, amount, currency } = req.body || {};

  if (!invoiceNumber || !email || amount == null) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "invoiceNumber, email, and amount are required" }),
    };
    return;
  }

  // PAYSTACK_SECRET_KEY — set in Azure Portal Application settings
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    context.res = {
      status: 503,
      headers: CORS,
      body: JSON.stringify({ error: "Payment not configured" }),
    };
    return;
  }

  // Paystack expects amount in smallest currency unit (pesewas for GHS)
  const amountInPesewas = Math.round(Number(amount) * 100);
  const reference = `PAY-${invoiceNumber}-${Date.now()}`;
  const callbackUrl = `https://oceaniccoder.dev/pay/${invoiceNumber}?payment=success`;

  try {
    const result = await httpsPost(
      "api.paystack.co",
      "/transaction/initialize",
      {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      {
        email,
        amount: amountInPesewas,
        currency: currency || "GHS",
        reference,
        callback_url: callbackUrl,
        metadata: { invoiceNumber },
      },
    );

    if (result.status !== 200 && result.status !== 201) {
      context.log.error("Paystack init error:", result.status, result.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to initialize payment" }),
      };
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(result.body);
    } catch {
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Invalid response from payment provider" }),
      };
      return;
    }

    if (!parsed.status || !parsed.data) {
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: parsed.message || "Payment initialization failed" }),
      };
      return;
    }

    context.res = {
      status: 200,
      headers: CORS,
      body: JSON.stringify({
        authorizationUrl: parsed.data.authorization_url,
        reference: parsed.data.reference,
      }),
    };
  } catch (err) {
    context.log.error("paystack-init error:", err.message);
    context.res = {
      status: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Internal error" }),
    };
  }
};
