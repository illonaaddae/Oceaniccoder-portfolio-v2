// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");

const NOW = new Date("2026-10-20T09:14:03.120Z");
const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const IP = "203.0.113.7";
const SID = "s_3q8Zr0kD2m1xVb7YtQ9wLw";

function fakeContainer() {
  const docs = [];
  const salts = new Map();
  return {
    docs,
    item: (id) => ({ read: async () => ({ resource: salts.get(id) }) }),
    items: {
      create: vi.fn(async (doc) => {
        if (doc.type === "salt") salts.set(doc.id, doc);
        else docs.push(doc);
        return { resource: doc };
      }),
    },
  };
}

const entryView = {
  t: "pv",
  path: "/blog/my-post",
  entry: true,
  ref: "www.linkedin.com",
  ch: "social",
  utm: { source: "linkedin", medium: "social", campaign: "oct-launch" },
};

function setup({ env = {}, container = fakeContainer() } = {}) {
  const handler = createHandler({
    container: () => container,
    now: () => NOW,
    env,
    random: () => 1, // never sample drop logs in tests
  });
  const call = async ({ method = "POST", headers = {}, body, rawBody } = {}) => {
    const context = { log: Object.assign(vi.fn(), { error: vi.fn() }) };
    const payload =
      body === undefined
        ? { v: 1, sid: SID, tz: "Africa/Accra", lang: "en-GB", events: [entryView] }
        : body;
    await handler(context, {
      method,
      headers: {
        origin: "https://oceaniccoder.dev",
        "user-agent": UA,
        "x-forwarded-for": `${IP}:51234`,
        "sec-fetch-site": "same-origin",
        ...headers,
      },
      body: payload,
      rawBody: rawBody ?? JSON.stringify(payload),
    });
    return { status: context.res.status, context };
  };
  return { container, call };
}

describe("POST /api/visit", () => {
  it("writes one page-view document with a ttl and no IP or UA", async () => {
    const t = setup();
    const r = await t.call();
    expect(r.status).toBe(204);
    expect(t.container.docs).toHaveLength(1);
    const doc = t.container.docs[0];
    expect(doc).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{20}$/),
      type: "pv",
      day: "2026-10-20",
      ts: "2026-10-20T09:14:03.120Z",
      sid: SID,
      vh: expect.stringMatching(/^[0-9a-f]{16}$/),
      path: "/blog/my-post",
      entry: true,
      ref: "www.linkedin.com",
      ch: "social",
      utm: { s: "linkedin", m: "social", c: "oct-launch", t: null, x: null },
      dev: "mobile",
      br: "chrome",
      os: "android",
      cc: "GH",
      lang: "en",
      ttl: 90 * 86400,
    });
    const stored = JSON.stringify(doc);
    expect(stored).not.toContain(IP);
    expect(stored).not.toContain("Mozilla");
  });

  it("uses ANALYTICS_RAW_TTL_DAYS when it is a valid number of days", async () => {
    const t = setup({ env: { ANALYTICS_RAW_TTL_DAYS: "30" } });
    await t.call();
    expect(t.container.docs[0].ttl).toBe(30 * 86400);

    const bad = setup({ env: { ANALYTICS_RAW_TTL_DAYS: "forever" } });
    await bad.call();
    expect(bad.container.docs[0].ttl).toBe(90 * 86400);
  });

  it("writes events and leave timings in their own shapes", async () => {
    const t = setup();
    await t.call({
      body: {
        v: 1,
        sid: SID,
        events: [
          { t: "ev", name: "cta_click", prop: "hire-me", path: "/" },
          { t: "leave", path: "/", ms: 30500 },
        ],
      },
    });
    const [ev, leave] = t.container.docs;
    expect(ev).toMatchObject({ type: "ev", name: "cta_click", prop: "hire-me", path: "/" });
    expect(ev.vh).toMatch(/^[0-9a-f]{16}$/);
    expect(leave).toEqual({
      id: expect.any(String),
      type: "leave",
      day: "2026-10-20",
      ts: NOW.toISOString(),
      sid: SID,
      path: "/",
      ms: 30500,
      ttl: 90 * 86400,
    });
  });

  it("gives the same visitor the same hash within a day", async () => {
    const t = setup();
    await t.call();
    await t.call();
    expect(t.container.docs[0].vh).toBe(t.container.docs[1].vh);
  });

  it.each([
    ["DNT header", { headers: { dnt: "1" } }],
    ["GPC header", { headers: { "sec-gpc": "1" } }],
    ["foreign origin", { headers: { origin: "https://evil.example" } }],
    ["no origin or referer", { headers: { origin: undefined } }],
    ["localhost in production", { headers: { origin: "http://localhost:5173" } }],
    ["cross-site fetch", { headers: { "sec-fetch-site": "cross-site" } }],
    ["bot UA", { headers: { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" } }],
    ["missing UA", { headers: { "user-agent": undefined } }],
    ["invalid payload", { body: { v: 1, sid: SID, events: [{ t: "pv", path: "/q/secret" }] } }],
    ["garbage body", { body: "not json", rawBody: "not json" }],
  ])("answers 204 and writes nothing for a %s", async (_label, request) => {
    const t = setup();
    const r = await t.call(request);
    expect(r.status).toBe(204);
    expect(t.container.items.create).not.toHaveBeenCalled();
  });

  it("accepts localhost off production", async () => {
    const t = setup({ env: { AZURE_FUNCTIONS_ENVIRONMENT: "Development" } });
    await t.call({ headers: { origin: "http://localhost:5173", "sec-fetch-site": "same-site" } });
    expect(t.container.docs).toHaveLength(1);
  });

  it("parses a JSON string body", async () => {
    const t = setup();
    const text = JSON.stringify({ v: 1, sid: SID, events: [{ t: "pv", path: "/" }] });
    await t.call({ body: text, rawBody: text });
    expect(t.container.docs).toHaveLength(1);
  });

  it("refuses an oversized body with 413", async () => {
    const t = setup();
    const r = await t.call({ rawBody: "x".repeat(4 * 1024 + 1) });
    expect(r.status).toBe(413);
    expect(t.container.items.create).not.toHaveBeenCalled();
  });

  it("refuses other methods with 405", async () => {
    const r = await setup().call({ method: "GET" });
    expect(r.status).toBe(405);
  });

  it("stops writing after 60 events a minute from one visitor", async () => {
    const t = setup();
    const ten = {
      v: 1,
      sid: SID,
      events: Array.from({ length: 10 }, () => ({ t: "pv", path: "/" })),
    };
    for (let i = 0; i < 7; i += 1) await t.call({ body: ten });
    expect(t.container.docs).toHaveLength(60);
  });

  it("still answers 204 and logs when Cosmos fails", async () => {
    const container = fakeContainer();
    container.items.create = vi.fn(async () => {
      throw Object.assign(new Error("Request rate is large"), { code: 429 });
    });
    const t = setup({ container });
    const r = await t.call();
    expect(r.status).toBe(204);
    expect(r.context.log.error).toHaveBeenCalled();
  });

  it("drops the event when the salt can't be read, never hashing without it", async () => {
    const container = fakeContainer();
    container.item = () => ({
      read: async () => {
        throw Object.assign(new Error("unavailable"), { code: 503 });
      },
    });
    const t = setup({ container });
    const r = await t.call();
    expect(r.status).toBe(204);
    expect(container.items.create).not.toHaveBeenCalled();
  });
});
