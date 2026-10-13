// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";

const handler = (await import("./index.js")).default;

// With no OPENAI_API_KEY an allowed request stops at 503 before any network
// call, so 503 means "not rate limited" and 429 means "rate limited".
async function chat(xff) {
  const context = { log: Object.assign(() => {}, { error: () => {} }) };
  await handler(context, {
    method: "POST",
    headers: xff === undefined ? {} : { "x-forwarded-for": xff },
    body: { messages: [{ role: "user", content: "Hi" }] },
  });
  return context.res.status;
}

// SWA appends the real client and then its own internal hop.
const viaSwa = (client, spoofed) =>
  [spoofed, `${client}:51234`, "[fd00::78df:1]:443"].filter(Boolean).join(", ");

describe("chat rate limit", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("limits a real client after 20 requests a minute", async () => {
    for (let i = 0; i < 20; i += 1) expect(await chat(viaSwa("203.0.113.7"))).toBe(503);
    expect(await chat(viaSwa("203.0.113.7"))).toBe(429);
  });

  it("ignores a forged left-most X-Forwarded-For entry", async () => {
    for (let i = 0; i < 20; i += 1) {
      expect(await chat(viaSwa("198.51.100.9", `10.0.${i}.1, 192.0.2.${i}`))).toBe(503);
    }
    expect(await chat(viaSwa("198.51.100.9", "192.0.2.250"))).toBe(429);
  });

  it("keeps separate buckets for separate clients", async () => {
    for (let i = 0; i < 20; i += 1) await chat(viaSwa("198.51.100.20"));
    expect(await chat(viaSwa("198.51.100.20"))).toBe(429);
    expect(await chat(viaSwa("198.51.100.21"))).toBe(503);
  });

  it("answers a preflight with 204", async () => {
    const context = {};
    await handler(context, { method: "OPTIONS", headers: {} });
    expect(context.res.status).toBe(204);
  });
});
