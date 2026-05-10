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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  const { email } = req.body || {};

  if (!email || !isValidEmail(email)) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Valid email required" }),
    };
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    context.log.warn("RESEND_API_KEY or RESEND_AUDIENCE_ID not set");
    context.res = {
      status: 503,
      headers: CORS,
      body: JSON.stringify({ error: "Newsletter not configured" }),
    };
    return;
  }

  try {
    const result = await httpsPost(
      "api.resend.com",
      `/audiences/${audienceId}/contacts`,
      { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      { email, unsubscribed: false },
    );

    if (result.status === 200 || result.status === 201) {
      context.res = {
        status: 200,
        headers: CORS,
        body: JSON.stringify({ success: true }),
      };
    } else if (result.status === 409) {
      // Already subscribed — treat as success so UX is clean
      context.res = {
        status: 200,
        headers: CORS,
        body: JSON.stringify({ success: true }),
      };
    } else {
      context.log.error("Resend contacts API error:", result.status, result.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to subscribe. Please try again." }),
      };
    }
  } catch (err) {
    context.log.error("Newsletter signup error:", err.message);
    context.res = {
      status: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Internal error" }),
    };
  }
};
