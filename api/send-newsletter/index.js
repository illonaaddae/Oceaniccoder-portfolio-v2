const https = require("https");
const { Client, Account } = require("node-appwrite");

// This endpoint sends mail from a verified domain to a real subscriber list,
// so it is restricted to the site itself and to a signed-in admin. It used to
// allow any origin with no caller identity at all.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev";

// Same constants the other functions use. This one originally read them from
// the environment with no fallback, and APPWRITE_PROJECT_ID is not set in
// Azure — nothing else needs it — so setProject(undefined) made every JWT
// check throw and every caller was told they were not signed in.
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  Vary: "Origin",
  "Content-Type": "application/json",
};

/** Everything interpolated into the email body is attacker-controlled input. */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s) URLs may reach an href or src. */
function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:" ? esc(url.toString()) : "";
  } catch {
    return "";
  }
}

function httpsRequest(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : "";
    const req = https.request(
      {
        hostname,
        path,
        method,
        headers: body ? { ...headers, "Content-Length": Buffer.byteLength(data) } : headers,
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
    if (data) req.write(data);
    req.end();
  });
}

/**
 * Resolves the caller from an Appwrite JWT.
 * Returns the user on success, or null when the token is missing or invalid.
 */
/**
 * Every token the request might be carrying, best candidate first.
 *
 * x-appwrite-jwt is preferred over Authorization on purpose. Azure Static Web
 * Apps puts its own principal token in Authorization, so reading that header
 * first meant verifying Azure's token against Appwrite and failing with
 * "Signature failed" — a valid-looking token from the wrong issuer, which
 * reads as a broken session rather than as the wrong header being used.
 *
 * Both are returned and tried in turn, so this works whichever header
 * survives the hosting layer.
 */
function readJwtCandidates(req) {
  const headers = req.headers || {};
  const candidates = [];
  const add = (token) => {
    const t = (token || "").trim();
    if (t && !candidates.includes(t)) candidates.push(t);
  };

  add(headers["x-appwrite-jwt"] || headers["X-Appwrite-JWT"]);

  // The body always survives the hosting layer, unlike headers.
  add(req.body && req.body.jwt);

  const auth = (headers.authorization || headers.Authorization || "").trim();
  if (auth.startsWith("Bearer ")) add(auth.slice(7));

  return candidates;
}

/** Which transports carried something — no token material, only shape. */
function describeTransports(req) {
  const headers = req.headers || {};
  const size = (v) => (v ? String(v).trim().length : 0);
  return {
    xAppwriteJwt: size(headers["x-appwrite-jwt"] || headers["X-Appwrite-JWT"]),
    body: size(req.body && req.body.jwt),
    authorization: size(headers.authorization || headers.Authorization),
  };
}

/**
 * Resolves the caller from an Appwrite JWT.
 *
 * Returns { user } on success, or { error } describing why not — the two
 * failures have to be told apart, because reporting a misconfigured function
 * as "you are not signed in" sends you looking in the wrong place.
 */
async function resolveCaller(context, req) {
  const candidates = readJwtCandidates(req);
  if (candidates.length === 0) return { error: "no-token" };

  let lastMessage = "";
  for (const jwt of candidates) {
    try {
      const client = new Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setJWT(jwt);
      return { user: await new Account(client).get() };
    } catch (err) {
      lastMessage = err.message;
      context.log.warn(
        `Newsletter auth: token candidate rejected (len ${jwt.length}) — ${err.message}`,
      );
    }
  }

  return { error: "invalid-token", detail: lastMessage };
}

const handler = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  // Gate first: this used to be anonymous, so anyone who knew the URL could
  // mail the entire subscriber list arbitrary content from the verified
  // sending domain.
  const { user: caller, error: authError, detail } = await resolveCaller(context, req);
  if (!caller) {
    context.res = {
      status: 401,
      headers: CORS,
      body: JSON.stringify({
        error:
          authError === "no-token"
            ? "The request carried no session token — reload the dashboard and try again."
            : `Your session was not accepted (${detail || "unknown reason"}). Sign out and back in, then retry.`,
        // Lengths only, never token material. Which transport survived the
        // hosting layer is the one thing that cannot be worked out from
        // outside, and it is what this failure has turned on twice.
        transports: describeTransports(req),
      }),
    };
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && caller.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    context.log.warn("Newsletter refused for non-admin account:", caller.$id);
    context.res = {
      status: 403,
      headers: CORS,
      body: JSON.stringify({ error: "This account cannot send the newsletter." }),
    };
    return;
  }

  const { title, excerpt, slug, category, image, mode } = req.body || {};
  // A test goes to the admin address held in configuration. The recipient is
  // never taken from the request, so this cannot be used to mail a third party.
  const isTest = mode === "test";

  if (!title || !slug) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "title and slug are required" }),
    };
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "newsletter@send.oceaniccoder.dev";
  const testRecipient = process.env.RESEND_TO_EMAIL;

  if (!apiKey || (!isTest && !audienceId)) {
    context.log.warn("RESEND_API_KEY or RESEND_AUDIENCE_ID not set — skipping newsletter");
    context.res = {
      status: 503,
      headers: CORS,
      body: JSON.stringify({ error: "Newsletter not configured" }),
    };
    return;
  }

  if (isTest && !testRecipient) {
    context.res = {
      status: 503,
      headers: CORS,
      body: JSON.stringify({
        error: "RESEND_TO_EMAIL is not set, so there is nowhere to send a test.",
      }),
    };
    return;
  }

  const safeTitle = esc(title);
  const postUrl = `https://oceaniccoder.dev/blog/${encodeURIComponent(slug)}`;
  const categoryLine = category
    ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">${esc(category)}</p>`
    : "";
  const imageUrl = safeUrl(image);
  const imageBanner = imageUrl
    ? `<tr><td style="padding:0;"><img src="${imageUrl}" alt="${safeTitle}" width="600" style="display:block;width:100%;max-width:600px;height:220px;object-fit:cover;" /></td></tr>`
    : "";
  const testNotice = isTest
    ? `<tr><td style="padding:14px 40px;background:#334155;"><p style="margin:0;font-size:13px;color:#e2e8f0;font-weight:600;">Test send — this went only to you. Subscribers have not received it.</p></td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
        ${testNotice}
        ${imageBanner}
        <tr>
          <td style="background:linear-gradient(135deg,#0C8599 0%,#0a6e7d 100%);padding:32px 40px;">
            <p style="margin:0;font-size:13px;color:#ffffff;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">OceanicCoder Blog</p>
            <h1 style="margin:8px 0 0;font-size:24px;color:#ffffff;font-weight:700;">New Post Published</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            ${categoryLine}
            <h2 style="margin:0 0 16px;font-size:22px;color:#f1f5f9;font-weight:700;line-height:1.3;">${safeTitle}</h2>
            ${excerpt ? `<p style="margin:0 0 32px;font-size:15px;color:#94a3b8;line-height:1.7;">${esc(excerpt)}</p>` : ""}
            <a href="${postUrl}" style="display:inline-block;background:linear-gradient(135deg,#0C8599 0%,#0a6e7d 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">Read Article →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #334155;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
              You're receiving this because you subscribed to OceanicCoder updates.<br>
              <a href="https://oceaniccoder.dev" style="color:#0C8599;text-decoration:none;">oceaniccoder.dev</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    if (isTest) {
      const result = await httpsRequest("api.resend.com", "/emails", "POST", authHeaders, {
        from: `OceanicCoder <${fromEmail}>`,
        to: [testRecipient],
        subject: `[Test] New Post: ${title}`,
        html,
      });

      if (result.status === 200 || result.status === 201) {
        context.log.info(`Newsletter test sent to admin for post: ${title}`);
        context.res = {
          status: 200,
          headers: CORS,
          body: JSON.stringify({ success: true, test: true, sentTo: testRecipient }),
        };
      } else {
        context.log.error("Resend test send failed:", result.status, result.body);
        context.res = {
          status: 502,
          headers: CORS,
          body: JSON.stringify({ error: "Failed to send the test email" }),
        };
      }
      return;
    }

    // Step 1: create broadcast
    const createResult = await httpsRequest("api.resend.com", "/broadcasts", "POST", authHeaders, {
      audience_id: audienceId,
      from: `OceanicCoder <${fromEmail}>`,
      subject: `New Post: ${title}`,
      html,
    });

    if (createResult.status !== 200 && createResult.status !== 201) {
      context.log.error("Resend broadcast create failed:", createResult.status, createResult.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to create broadcast" }),
      };
      return;
    }

    const broadcast = JSON.parse(createResult.body);
    const broadcastId = broadcast.id || broadcast.data?.id;

    if (!broadcastId) {
      context.log.error("No broadcast ID in response:", createResult.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "No broadcast ID returned" }),
      };
      return;
    }

    // Step 2: send broadcast
    const sendResult = await httpsRequest(
      "api.resend.com",
      `/broadcasts/${broadcastId}/send`,
      "POST",
      authHeaders,
      {},
    );

    if (sendResult.status === 200 || sendResult.status === 201) {
      context.log.info(`Newsletter broadcast ${broadcastId} sent for post: ${title}`);
      context.res = {
        status: 200,
        headers: CORS,
        body: JSON.stringify({ success: true, broadcastId }),
      };
    } else {
      context.log.error("Resend broadcast send failed:", sendResult.status, sendResult.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to send broadcast" }),
      };
    }
  } catch (err) {
    context.log.error("send-newsletter error:", err.message);
    context.res = {
      status: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Internal error" }),
    };
  }
};

module.exports = handler;
// Exported for tests; the Azure runtime only uses the default export above.
module.exports.readJwtCandidates = readJwtCandidates;
module.exports.describeTransports = describeTransports;
