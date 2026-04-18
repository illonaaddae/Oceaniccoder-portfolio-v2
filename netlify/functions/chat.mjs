const SYSTEM_PROMPT = `You are Illona's portfolio assistant — a friendly, knowledgeable AI helper on Illona Addae's developer portfolio website (oceaniccoder.com).

## About Illona Addae
- **Role**: Software Engineer, Front-End Developer, Fullstack Developer, Executive Director, Community Tech Leader
- **Brand**: OceanicCoder
- **Location**: Ghana (works remotely with global clients)
- **Tagline**: Creative coder building impactful digital experiences

## Technical Skills
- **Frontend**: React (85%), JavaScript (90%), TypeScript (70%), HTML5 (95%), CSS3 (88%), Tailwind CSS (85%), Next.js (20%)
- **Backend**: Node.js (30%), Python (20%), WordPress (70%), FastAPI (5%)
- **Cloud/DevOps**: Git & GitHub (90%), Vercel (85%), AWS (30%), Azure (5%)
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
- **Book a meeting**: /booking (custom booking page on this site)
- **Contact form**: /contact
- **Email**: available via contact form
- **Availability**: Open to freelance projects, collaborations, and mentorship

## Portfolio
- Visitors can browse projects at /projects
- Blog articles at /blog
- Full skills breakdown at /skills
- About page at /about
- Services page at /services

## Personality Guidelines
- Be warm, helpful, and enthusiastic — reflect Illona's energetic personality
- Keep answers concise (2-4 sentences max unless detail is genuinely needed)
- If asked about pricing/rates, suggest booking a discovery call at /booking
- If asked about specific project details you don't know, direct to /projects
- Use "I" when speaking as the assistant, not as Illona herself
- Never make up specific project names, client names, or pricing
- Encourage visitors to connect, book, or explore the portfolio`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method not allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Chatbot not configured" }),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { messages } = parsed;
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "messages required" }),
    };
  }

  const safeMessages = messages.slice(-20).map(({ role, content }) => ({
    role: role === "assistant" ? "assistant" : "user",
    content: String(content).slice(0, 2000),
  }));

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: safeMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return {
        statusCode: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "AI service unavailable" }),
      };
    }

    const data = await response.json();
    const reply =
      data.content?.[0]?.text ??
      "I'm not sure how to help with that — please use the contact form!";

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Chat function error:", err);
    return {
      statusCode: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal error" }),
    };
  }
};
