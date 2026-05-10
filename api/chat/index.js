const https = require("https");

const SYSTEM_PROMPT = `You are Illona's portfolio assistant — a friendly, knowledgeable AI helper on Illona Addae's developer portfolio website (oceaniccoder.dev).

## About Illona Addae
- **Role**: Software Engineer, Front-End Developer, Fullstack Developer, Executive Director, Community Tech Leader
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
- IMPORTANT: Never use markdown formatting (no **bold**, no *italic*, no bullet hyphens, no headers). Write in plain conversational prose only.`;

// In-memory rate limiter: 20 requests per minute per IP
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  // Purge stale entries when map grows large
  if (rateLimitMap.size > 500) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

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

  const clientIp =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.headers["client-ip"] ||
    "unknown";
  if (isRateLimited(clientIp)) {
    context.res = {
      status: 429,
      headers: CORS,
      body: JSON.stringify({ error: "Too many requests. Please wait a moment." }),
    };
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    context.res = {
      status: 503,
      headers: CORS,
      body: JSON.stringify({ error: "Chatbot not configured" }),
    };
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "messages required" }),
    };
    return;
  }

  const safeMessages = messages.slice(-20).map(({ role, content }) => ({
    role: role === "assistant" ? "assistant" : "user",
    content: String(content).slice(0, 2000),
  }));

  try {
    const result = await httpsPost(
      "api.openai.com",
      "/v1/chat/completions",
      {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      {
        model: "gpt-4o-mini",
        max_tokens: 512,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...safeMessages],
      },
    );

    if (result.status !== 200) {
      context.log.error("OpenAI API error:", result.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "AI service unavailable" }),
      };
      return;
    }

    const data = JSON.parse(result.body);
    const reply =
      data.choices?.[0]?.message?.content ??
      "I'm not sure how to help — please use the contact form!";

    context.res = { status: 200, headers: CORS, body: JSON.stringify({ reply }) };
  } catch (err) {
    context.log.error("Chat error:", err);
    context.res = { status: 500, headers: CORS, body: JSON.stringify({ error: "Internal error" }) };
  }
};
