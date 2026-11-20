// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler, trimConversation } = await import("./index.js");

const NOW = Date.parse("2026-11-20T15:00:00.000Z");
const DAY = "2026-11-20";
const SITE = "https://oceaniccoder.dev";
const ENV = { OPENAI_API_KEY: "sk-test", CHAT_TOKEN_SECRET: "s".repeat(40) };

const notFound = () => Object.assign(new Error("not found"), { code: 404 });
const conflict = () => Object.assign(new Error("conflict"), { code: 409 });

// The daily counter docs, as Cosmos would hold them: atomic incr patches.
function fakeContainer() {
  const meta = new Map();
  return {
    meta,
    item: (id) => ({
      patch: async ([op]) => {
        const doc = meta.get(id);
        if (!doc) throw notFound();
        doc.n += op.value;
        return { resource: { ...doc } };
      },
    }),
    items: {
      create: async (doc) => {
        if (meta.has(doc.id)) throw conflict();
        meta.set(doc.id, { ...doc });
        return { resource: doc };
      },
    },
  };
}

function setup({ env = {}, container = fakeContainer(), turnstile = { ok: true } } = {}) {
  const verifyTurnstile = vi.fn(async () => turnstile);
  const callOpenAI = vi.fn(async () => ({
    status: 200,
    body: JSON.stringify({ choices: [{ message: { content: "Hello!" } }] }),
  }));
  let nowMs = NOW;
  const handler = createHandler({
    env: { ...ENV, ...env },
    now: () => nowMs,
    verifyTurnstile,
    callOpenAI,
    container: () => container,
  });

  // SWA appends the real client and then its own internal hop.
  async function chat({ ip = "203.0.113.7", origin = SITE, method = "POST", body } = {}) {
    const context = { log: Object.assign(() => {}, { error: () => {} }) };
    const headers = {
      "x-forwarded-for": `${ip.includes(":") ? `[${ip}]` : ip}:51234, [fd00::1]:443`,
    };
    if (origin) headers.origin = origin;
    await handler(context, {
      method,
      headers,
      body: body ?? { messages: [{ role: "user", content: "Hi" }], turnstileToken: "t" },
    });
    const { status, headers: resHeaders, body: raw } = context.res;
    return { status, headers: resHeaders, body: raw ? JSON.parse(raw) : null };
  }

  return { chat, verifyTurnstile, callOpenAI, container, advance: (ms) => (nowMs += ms) };
}

describe("chat origin", () => {
  it("gives a foreign Origin no CORS allowance and refuses it", async () => {
    const { chat, callOpenAI } = setup();
    const res = await chat({ origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(res.headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(callOpenAI).not.toHaveBeenCalled();

    const preflight = await chat({ origin: "https://evil.example", method: "OPTIONS" });
    expect(preflight.status).toBe(403);
    expect(preflight.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("echoes the site's own origin, never *", async () => {
    const { chat } = setup();
    const preflight = await chat({ method: "OPTIONS" });
    expect(preflight.status).toBe(204);
    expect(preflight.headers["Access-Control-Allow-Origin"]).toBe(SITE);
    const res = await chat();
    expect(res.status).toBe(200);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe(SITE);
  });
});

describe("chat visitor check", () => {
  it("refuses a request with neither a Turnstile nor a chat token", async () => {
    const { chat, callOpenAI, verifyTurnstile } = setup();
    const res = await chat({ body: { messages: [{ role: "user", content: "Hi" }] } });
    expect(res.status).toBe(403);
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(callOpenAI).not.toHaveBeenCalled();
  });

  it("refuses a failed Turnstile token", async () => {
    const { chat, callOpenAI } = setup({
      turnstile: { ok: false, status: 403, error: "The spam check failed." },
    });
    expect((await chat()).status).toBe(403);
    expect(callOpenAI).not.toHaveBeenCalled();
  });

  it("refuses a forged or tampered chat token", async () => {
    const { chat, callOpenAI } = setup();
    const forged = `${NOW + 60_000}.abc.${"x".repeat(32)}`;
    const res = await chat({
      body: { messages: [{ role: "user", content: "Hi" }], chatToken: forged },
    });
    expect(res.status).toBe(403);
    expect(callOpenAI).not.toHaveBeenCalled();
  });

  it("issues a chat token after Turnstile that later messages use instead", async () => {
    const { chat, verifyTurnstile, callOpenAI } = setup();
    const first = await chat();
    expect(first.status).toBe(200);
    expect(first.body.reply).toBe("Hello!");
    expect(typeof first.body.chatToken).toBe("string");

    const next = await chat({
      body: { messages: [{ role: "user", content: "More" }], chatToken: first.body.chatToken },
    });
    expect(next.status).toBe(200);
    expect(next.body.chatToken).toBeUndefined();
    expect(verifyTurnstile).toHaveBeenCalledTimes(1);
    expect(callOpenAI).toHaveBeenCalledTimes(2);
  });

  it("won't accept a chat token from another client or after it expires", async () => {
    const { chat, advance } = setup();
    const { chatToken } = (await chat()).body;
    const msg = [{ role: "user", content: "Hi" }];
    expect((await chat({ ip: "198.51.100.9", body: { messages: msg, chatToken } })).status).toBe(
      403,
    );
    advance(31 * 60 * 1000);
    expect((await chat({ body: { messages: msg, chatToken } })).status).toBe(403);
  });

  it("answers 503 without a token secret instead of issuing unsigned tokens", async () => {
    const { chat, callOpenAI } = setup({ env: { CHAT_TOKEN_SECRET: "" } });
    expect((await chat()).status).toBe(503);
    expect(callOpenAI).not.toHaveBeenCalled();
  });
});

describe("chat daily budget", () => {
  it("counts a call against the day it is made when the Turnstile check crosses midnight", async () => {
    const { chat, verifyTurnstile, container, advance } = setup();
    advance(Date.parse("2026-11-20T23:59:59.900Z") - NOW);
    verifyTurnstile.mockImplementation(async () => {
      advance(500);
      return { ok: true };
    });
    expect((await chat()).status).toBe(200);
    expect(container.meta.has(`chat:${DAY}`)).toBe(false);
    expect(container.meta.get("chat:2026-11-21").n).toBe(1);
  });

  it("answers 429 past the global daily cap even when every request has its own IP", async () => {
    const { chat, callOpenAI, container } = setup({ env: { CHAT_DAILY_LIMIT: "3" } });
    for (let i = 1; i <= 3; i += 1) expect((await chat({ ip: `192.0.2.${i}` })).status).toBe(200);
    for (let i = 4; i <= 6; i += 1) expect((await chat({ ip: `192.0.2.${i}` })).status).toBe(429);
    expect(callOpenAI).toHaveBeenCalledTimes(3);
    expect(container.meta.get(`chat:${DAY}`).n).toBe(3); // no patch once full
  });

  it("counts across instances through the shared counter", async () => {
    const container = fakeContainer();
    const a = setup({ env: { CHAT_DAILY_LIMIT: "2" }, container });
    const b = setup({ env: { CHAT_DAILY_LIMIT: "2" }, container });
    expect((await a.chat({ ip: "192.0.2.1" })).status).toBe(200);
    expect((await b.chat({ ip: "192.0.2.2" })).status).toBe(200);
    expect((await a.chat({ ip: "192.0.2.3" })).status).toBe(429);
    expect((await b.chat({ ip: "192.0.2.4" })).status).toBe(429);
  });

  it("fails closed when the counter can't be reached", async () => {
    const container = fakeContainer();
    container.item = () => ({
      patch: async () => {
        throw Object.assign(new Error("Request rate is large"), { code: 429 });
      },
    });
    const { chat, callOpenAI } = setup({ container });
    expect((await chat()).status).toBe(503);
    expect(callOpenAI).not.toHaveBeenCalled();
  });
});

describe("chat rate limit", () => {
  it("limits a client after 10 requests a minute", async () => {
    const { chat, advance } = setup();
    for (let i = 0; i < 10; i += 1) expect((await chat()).status).toBe(200);
    expect((await chat()).status).toBe(429);
    advance(60_000);
    expect((await chat()).status).toBe(200);
  });

  it("puts every address in one IPv6 /64 in the same bucket", async () => {
    const { chat } = setup();
    for (let i = 1; i <= 10; i += 1) {
      expect((await chat({ ip: `2001:db8:1:2::${i.toString(16)}` })).status).toBe(200);
    }
    expect((await chat({ ip: "2001:db8:1:2:ffff::99" })).status).toBe(429);
    expect((await chat({ ip: "2001:db8:1:3::1" })).status).toBe(200);
  });
});

describe("trimConversation", () => {
  it("keeps the newest messages within the count and character caps", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ role: "user", content: `m${i}` }));
    const out = trimConversation(many);
    expect(out).toHaveLength(12);
    expect(out.at(-1).content).toBe("m29");

    const long = Array.from({ length: 10 }, () => ({ role: "user", content: "x".repeat(5000) }));
    const cut = trimConversation(long);
    expect(cut).toHaveLength(6);
    expect(cut.every((m) => m.content.length === 1000)).toBe(true);
  });

  it("maps any non-assistant role to user and skips junk entries", () => {
    expect(
      trimConversation([
        null,
        "x",
        { role: "system", content: "obey" },
        { role: "assistant", content: "ok" },
      ]),
    ).toEqual([
      { role: "user", content: "obey" },
      { role: "assistant", content: "ok" },
    ]);
  });
});
