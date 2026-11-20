// POST /api/chat — the site's chat bubble, answered by gpt-4o-mini under the
// owner's OPENAI_API_KEY. Anonymous, so every accepted request costs money.
// Spend is capped four ways, in this order:
//   1. Origin: a browser request from any site other than oceaniccoder.dev
//      (or the deployment's own host) is refused, and CORS is never `*`, so
//      another site can't embed the bot for its visitors;
//   2. 10 requests a minute per client, per instance. The key is the IP the
//      platform appended (clientIp), with IPv6 grouped by /64 (rateLimitKey);
//   3. proof of a real visitor: the first message carries a Turnstile token,
//      and the reply hands back a signed chat token (30 minutes, bound to the
//      client's rate-limit key) that later messages carry instead;
//   4. CHAT_DAILY_LIMIT requests (default 500) per UTC day across all
//      instances, one atomic Cosmos counter patch per request
//      (shared/dailyCeiling.js). If the counter can't be reached the request
//      is refused: an unbounded bill is worse than a chat outage.
// The conversation sent on is cut to the last 12 messages, 1,000 characters
// each and 6,000 in total. A hard monthly budget on the OpenAI project is the
// backstop for everything here.
//
// Chat tokens are HMACs under CHAT_TOKEN_SECRET (falling back to
// QUOTE_ACCESS_SECRET, with a "chat" purpose prefix so neither signature can
// stand in for the other). Without either secret, or without
// TURNSTILE_SECRET_KEY, the endpoint answers 503.

const https = require("https");
const crypto = require("crypto");
const { clientIp, verifyTurnstile } = require("../shared/turnstile");
const { createRateLimiter, rateLimitKey } = require("../shared/rateLimit");
const { createDailyCeiling } = require("../shared/dailyCeiling");
const { getAnalyticsContainer } = require("../shared/cosmos");
const { signLink, verifyLink } = require("../shared/tokens");

const SYSTEM_PROMPT = `You are Illona's portfolio assistant, a friendly, knowledgeable AI helper on Illona Addae's developer portfolio website (oceaniccoder.dev).

## About Illona Addae
- **Role**: Software Engineer, AI Engineer, Full-Stack Developer, Executive Director, Community Tech Leader
- **Brand**: OceanicCoder
- **Location**: Ghana (works remotely with global clients)
- **Tagline**: Creative coder building impactful digital experiences

## Technical Skills
- **Frontend**: React (85%), JavaScript (90%), TypeScript (70%), HTML5 (95%), CSS3 (88%), Tailwind CSS (85%), Next.js (20%)
- **Backend**: Node.js (30%), Python (20%), WordPress (70%), FastAPI (5%)
- **Cloud/DevOps**: Git & GitHub (90%), Vercel (85%), AWS (30%), Azure (65%)
- **Design**: Figma (82%), Canva (85%), Adobe Photoshop (70%), UI/UX Design (78%)
- **AI**: AI Engineering (35%), Prompt Engineering (40%), OpenAI (20%)
- **Leadership**: Team Leadership (88%), Mentoring (90%), Public Speaking (85%), Content Creation (90%)

## Services Offered
- Custom web development (React, Next.js, WordPress)
- UI/UX design and prototyping
- Frontend architecture and code review
- Mentorship for junior developers
- Community tech leadership and workshops
- AI-powered web solutions

## Contact & Booking
- **Book a meeting**: /booking (choose Google Meet or Zoom as your preferred platform)
- **Contact form**: /contact
- **Availability**: Open to freelance projects, collaborations, and mentorship

## Portfolio
- Projects: /projects | Blog: /blog | Skills: /skills | About: /about | Services: /services

## Personality Guidelines
- Be warm, helpful, and enthusiastic
- Keep answers concise (2-4 sentences max unless detail is genuinely needed)
- If asked about pricing/rates, suggest booking a discovery call at /booking
- Use "I" when speaking as the assistant, not as Illona herself
- Never make up specific project names, client names, or pricing
- IMPORTANT: Never use markdown formatting (no **bold**, no *italic*, no bullet hyphens, no headers). Write in plain conversational prose only.
- IMPORTANT: Never use em dashes or en dashes. Use a comma, a full stop, or a plain hyphen instead. This is Illona's house style across the whole site.`;

const PER_CLIENT_LIMIT = 10;
const DEFAULT_DAILY_LIMIT = 500;
const CHAT_TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 1000;
const MAX_TOTAL_CHARS = 6000;
const DEFAULT_ORIGINS = ["https://oceaniccoder.dev", "https://www.oceaniccoder.dev"];
const LOCAL_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"];

const BASE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

/** Functions Core Tools sets Development; Azure leaves it unset or Production. */
const isLocal = (env) => env.AZURE_FUNCTIONS_ENVIRONMENT === "Development";

function allowedOrigins(env) {
  const extra = env.ALLOWED_ORIGIN ? [env.ALLOWED_ORIGIN] : [];
  return new Set([...DEFAULT_ORIGINS, ...extra, ...(isLocal(env) ? LOCAL_ORIGINS : [])]);
}

/**
 * Whether a request's Origin may use the bot. No Origin (curl, a server) is
 * left to the Turnstile and chat-token checks. An Origin on the allow-list,
 * or one naming the host the request was sent to (preview deployments), is
 * accepted; any other site is refused.
 */
function originAllowed(headers, env) {
  const origin = headers.origin;
  if (!origin) return true;
  if (allowedOrigins(env).has(origin)) return true;
  let host;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const own = [headers["x-forwarded-host"], headers.host]
    .filter(Boolean)
    .map((h) => String(h).split(",")[0].trim().toLowerCase());
  return own.includes(host);
}

function corsHeaders(headers, env) {
  const origin = headers.origin;
  if (!origin || !originAllowed(headers, env)) return { ...BASE_HEADERS, Vary: "Origin" };
  return {
    ...BASE_HEADERS,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function tokenSecret(env) {
  return env.CHAT_TOKEN_SECRET || env.QUOTE_ACCESS_SECRET || "";
}

/** A chat token: `<expiry ms>.<nonce>.<signature over both and the client key>`. */
function issueChatToken(clientKey, nowMs, secret) {
  const exp = nowMs + CHAT_TOKEN_TTL_MS;
  const nonce = crypto.randomBytes(12).toString("base64url");
  return `${exp}.${nonce}.${signLink("chat", `${exp}.${nonce}.${clientKey}`, secret)}`;
}

function chatTokenValid(token, clientKey, nowMs, secret) {
  if (typeof token !== "string" || token.length > 200) return false;
  const [exp, nonce, sig, extra] = token.split(".");
  if (extra !== undefined || !/^\d{13}$/.test(exp || "") || !nonce) return false;
  if (Number(exp) <= nowMs) return false;
  return verifyLink("chat", `${exp}.${nonce}.${clientKey}`, sig, secret);
}

/**
 * The conversation as sent to OpenAI: the newest messages that fit in
 * MAX_MESSAGES and MAX_TOTAL_CHARS, each cut to MAX_MESSAGE_CHARS, with roles
 * limited to user and assistant so a client can't inject a system message.
 */
function trimConversation(messages) {
  const out = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0 && out.length < MAX_MESSAGES; i -= 1) {
    const m = messages[i];
    if (!m || typeof m !== "object") continue;
    const content = String(m.content ?? "").slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;
    if (total + content.length > MAX_TOTAL_CHARS) break;
    total += content.length;
    out.unshift({ role: m.role === "assistant" ? "assistant" : "user", content });
  }
  return out;
}

function dailyLimit(env) {
  const n = Number(env.CHAT_DAILY_LIMIT);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_DAILY_LIMIT;
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

async function askOpenAI(apiKey, messages) {
  return httpsPost(
    "api.openai.com",
    "/v1/chat/completions",
    {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    {
      model: "gpt-4o-mini",
      max_tokens: 512,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    },
  );
}

function createHandler(deps = {}) {
  const env = deps.env || process.env;
  const now = deps.now || (() => Date.now());
  const verify = deps.verifyTurnstile || verifyTurnstile;
  const callOpenAI = deps.callOpenAI || askOpenAI;
  const getContainer = deps.container || getAnalyticsContainer;
  const allowClient = createRateLimiter({ limit: PER_CLIENT_LIMIT });
  let ceiling;
  let ceilingLimit;

  return async function (context, req) {
    const headers = req.headers || {};
    const cors = corsHeaders(headers, env);
    const reply = (status, body) => {
      context.res = { status, headers: cors, body: body === undefined ? "" : JSON.stringify(body) };
    };

    if (!originAllowed(headers, env)) return reply(403, { error: "Origin not allowed" });
    if (req.method === "OPTIONS") return reply(204);

    const nowMs = now();
    const ip = clientIp(req);
    const clientKey = rateLimitKey(ip);
    if (!allowClient(clientKey, 1, nowMs)) {
      return reply(429, { error: "Too many requests. Please wait a moment." });
    }

    const apiKey = env.OPENAI_API_KEY;
    const secret = tokenSecret(env);
    if (!apiKey || !secret) return reply(503, { error: "Chatbot not configured" });

    const { messages, chatToken, turnstileToken } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return reply(400, { error: "messages required" });
    }
    const conversation = trimConversation(messages);
    if (conversation.length === 0) return reply(400, { error: "messages required" });

    let issued;
    if (!chatTokenValid(chatToken, clientKey, nowMs, secret)) {
      if (!turnstileToken) {
        return reply(403, { error: "Please complete the spam check.", code: "verify" });
      }
      const check = await verify(turnstileToken, ip);
      if (!check.ok) {
        // A missing TURNSTILE_SECRET_KEY (500 from verifyTurnstile) is a setup gap.
        const status = check.status === 400 ? 403 : check.status === 500 ? 503 : check.status;
        return reply(status, { error: check.error, code: "verify" });
      }
      issued = issueChatToken(clientKey, nowMs, secret);
    }

    const limit = dailyLimit(env);
    try {
      if (!ceiling || ceilingLimit !== limit) {
        ceiling = createDailyCeiling(getContainer(), { limit, key: "chat" });
        ceilingLimit = limit;
      }
      // Read the clock again: the Turnstile check may have run past midnight.
      const day = new Date(now()).toISOString().slice(0, 10);
      if ((await ceiling(day, 1)) < 1) {
        return reply(429, {
          error: "The assistant has reached its limit for today. Please use the contact form.",
          ...(issued && { chatToken: issued }),
        });
      }
    } catch (err) {
      context.log.error("Chat budget unavailable:", err && (err.message || err));
      return reply(503, { error: "AI service unavailable" });
    }

    try {
      const result = await callOpenAI(apiKey, conversation);

      if (result.status !== 200) {
        context.log.error("OpenAI API error:", result.body);
        return reply(502, { error: "AI service unavailable" });
      }

      const data = JSON.parse(result.body);
      const text =
        data.choices?.[0]?.message?.content ??
        "I'm not sure how to help. Please use the contact form!";
      return reply(200, { reply: text, ...(issued && { chatToken: issued }) });
    } catch (err) {
      context.log.error("Chat error:", err);
      return reply(500, { error: "Internal error" });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.trimConversation = trimConversation;
