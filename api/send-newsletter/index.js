const https = require("https");
const { requireAdmin } = require("../shared/adminAuth");
const {
  esc,
  safeUrl,
  shell,
  heading,
  button,
  buttons,
  notice,
  small,
} = require("../shared/email/ui");

// This endpoint sends mail from a verified domain to a real subscriber list,
// so it is restricted to the site itself and to a signed-in admin. It used to
// allow any origin with no caller identity at all.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  Vary: "Origin",
  "Content-Type": "application/json",
};

const SUBSCRIBER_REASON = "You're receiving this because you subscribed to OceanicCoder updates.";

/**
 * The post announcement. Every request field is attacker-controlled input:
 * the kit escapes text and only lets https URLs into the image and the link.
 */
function newsletterEmailHtml({ title, excerpt, slug, category, image, isTest }) {
  const postUrl = `https://oceaniccoder.dev/blog/${encodeURIComponent(slug)}`;
  const imageUrl = image ? safeUrl(image) : "#";
  const banner =
    imageUrl !== "#"
      ? `<img src="${esc(imageUrl)}" alt="${esc(title)}" width="544" style="display:block;width:100%;max-width:544px;height:auto;max-height:240px;object-fit:cover;border:0;border-radius:12px;margin:0 0 24px">`
      : "";
  return shell({
    preview: excerpt || `New post: ${title}`,
    reason: SUBSCRIBER_REASON,
    body:
      (isTest
        ? notice({
            tone: "warn",
            text: "Test send: this went only to you. Subscribers have not received it.",
          })
        : "") +
      banner +
      heading({
        eyebrow: category ? `New post · ${category}` : "New post",
        title,
        intro: excerpt || undefined,
      }) +
      buttons(button({ href: postUrl, label: "Read the article" })) +
      small("Read more posts at", {
        href: "https://oceaniccoder.dev/blog",
        label: "oceaniccoder.dev/blog",
      }),
  });
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

const handler = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  // Gate first: this used to be anonymous, so anyone who knew the URL could
  // mail the entire subscriber list arbitrary content from the verified
  // sending domain. requireAdmin accepts the Static Web Apps admin session or
  // the Appwrite JWT, and fails closed when no admin is configured.
  const auth = await requireAdmin(context, req);
  if (!auth.user) {
    context.res = {
      status: auth.status,
      headers: CORS,
      body: JSON.stringify({
        error: auth.error,
        // Lengths only, never token material: which transport survived the
        // hosting layer can't be worked out from outside.
        ...(auth.status === 401 && { transports: describeTransports(req) }),
      }),
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

  const html = newsletterEmailHtml({ title, excerpt, slug, category, image, isTest });

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
module.exports.newsletterEmailHtml = newsletterEmailHtml;
