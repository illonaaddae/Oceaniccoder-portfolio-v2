// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler, createRateLimiter, createDailyCeiling } = await import("./index.js");

const NOW = new Date("2026-10-20T09:14:03.120Z");
const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const IP = "203.0.113.7";
const SID = "s_3q8Zr0kD2m1xVb7YtQ9wLw";

const conflict = () => Object.assign(new Error("conflict"), { code: 409 });
const notFound = () => Object.assign(new Error("not found"), { code: 404 });
const throttled = () => Object.assign(new Error("Request rate is large"), { code: 429 });

// Event docs land in `docs`; salt and daily-count docs are kept apart.
function fakeContainer() {
  const docs = [];
  const meta = new Map();
  return {
    docs,
    meta,
    item: (id) => ({
      read: async () => ({ resource: meta.get(id) }),
      patch: vi.fn(async ([op]) => {
        const doc = meta.get(id);
        if (!doc) throw notFound();
        doc.n += op.value;
        return { resource: doc };
      }),
    }),
    items: {
      create: vi.fn(async (doc) => {
        if (doc.type === "salt" || doc.type === "count") {
          if (meta.has(doc.id)) throw conflict();
          meta.set(doc.id, { ...doc });
        } else docs.push(doc);
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
const fiveViews = {
  v: 1,
  sid: SID,
  events: Array.from({ length: 5 }, () => ({ t: "pv", path: "/" })),
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
      utm: { s: "linkedin", m: "social", c: "oct-launch" },
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
    ["made-up path", { body: { v: 1, sid: SID, events: [{ t: "pv", path: "/buy-cheap-pills" }] } }],
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

  it("caps one IP at 60 events a minute, however often it changes its UA", async () => {
    const t = setup();
    for (let i = 0; i < 14; i += 1) {
      await t.call({ body: fiveViews, headers: { "user-agent": `${UA} rotated/${i}` } });
    }
    expect(t.container.docs).toHaveLength(60);
    // A different client is unaffected.
    await t.call({ body: fiveViews, headers: { "x-forwarded-for": "198.51.100.9" } });
    expect(t.container.docs).toHaveLength(65);
  });

  it("keys bracketed IPv6 clients by address, not by port", async () => {
    const t = setup();
    for (let port = 1000; port < 1014; port += 1) {
      await t.call({ body: fiveViews, headers: { "x-forwarded-for": `[2001:db8::1]:${port}` } });
    }
    expect(t.container.docs).toHaveLength(60);
  });

  it("caps one instance at 300 events a minute across all clients", async () => {
    const t = setup();
    for (let i = 0; i < 62; i += 1) {
      await t.call({ body: fiveViews, headers: { "x-forwarded-for": `198.51.100.${i}` } });
    }
    expect(t.container.docs).toHaveLength(300);
  });

  it("stops writing raw events once the day's ceiling is reached", async () => {
    const container = fakeContainer();
    container.meta.set("count:2026-10-20", { id: "count:2026-10-20", n: 49998 });
    const t = setup({ container });
    await t.call({ body: fiveViews }); // first sync: 49998 + 5 > 50000 → dropped
    await t.call(); // one event: fits
    expect(t.container.docs).toHaveLength(1);
  });

  it("still answers 204 and logs when Cosmos fails", async () => {
    const container = fakeContainer();
    container.items.create = vi.fn(async () => {
      throw throttled();
    });
    const t = setup({ container });
    const r = await t.call();
    expect(r.status).toBe(204);
    expect(r.context.log.error).toHaveBeenCalled();
  });

  it("drops the event when the salt can't be read, never hashing without it", async () => {
    const container = fakeContainer();
    const item = container.item;
    container.item = (id) => ({
      ...item(id),
      read: async () => {
        throw Object.assign(new Error("unavailable"), { code: 503 });
      },
    });
    const t = setup({ container });
    const r = await t.call();
    expect(r.status).toBe(204);
    expect(container.docs).toHaveLength(0);
  });
});

describe("createRateLimiter", () => {
  it("evicts the oldest key when full instead of resetting everyone", () => {
    const allow = createRateLimiter({ limit: 2, maxKeys: 2 });
    expect(allow("a", 1, 0)).toBe(true);
    expect(allow("b", 2, 1)).toBe(true);
    expect(allow("c", 1, 2)).toBe(true); // evicts "a"
    expect(allow("b", 1, 3)).toBe(false); // "b" kept its count
    expect(allow("a", 2, 4)).toBe(true); // "a" starts over
  });

  it("opens a new window after a minute", () => {
    const allow = createRateLimiter({ limit: 1 });
    expect(allow("a", 1, 0)).toBe(true);
    expect(allow("a", 1, 59_999)).toBe(false);
    expect(allow("a", 1, 60_000)).toBe(true);
  });
});

describe("createDailyCeiling", () => {
  const DAY = "2026-10-20";

  it("creates the day's counter, then batches increments", async () => {
    const container = fakeContainer();
    const allow = createDailyCeiling(container, { limit: 100, flushEvery: 3 });
    expect(await allow(DAY, 1, 1000)).toBe(true); // first of the day: syncs first
    expect(container.meta.get(`count:${DAY}`)).toMatchObject({
      type: "count",
      day: DAY,
      n: 0,
      ttl: 2 * 86400,
    });
    expect(await allow(DAY, 1, 2000)).toBe(true);
    expect(container.meta.get(`count:${DAY}`).n).toBe(0);
    expect(await allow(DAY, 1, 3000)).toBe(true); // 3 pending → flush
    expect(container.meta.get(`count:${DAY}`).n).toBe(3);
    expect(await allow(DAY, 1, 4000)).toBe(true);
    expect(container.meta.get(`count:${DAY}`).n).toBe(3);
    expect(await allow(DAY, 1, 64_000)).toBe(true); // a minute later → flush
    expect(container.meta.get(`count:${DAY}`).n).toBe(5);
  });

  it("learns other instances' writes from the counter and refuses past the limit", async () => {
    const container = fakeContainer();
    container.meta.set(`count:${DAY}`, { id: `count:${DAY}`, n: 8 });
    const allow = createDailyCeiling(container, { limit: 10, flushEvery: 50 });
    expect(await allow(DAY, 1, 1000)).toBe(true); // syncs: total 9
    expect(await allow(DAY, 1, 2000)).toBe(true); // 9 + 1 pending = 10
    expect(await allow(DAY, 1, 3000)).toBe(false);
    expect(await allow("2026-10-21", 1, 4000)).toBe(true); // a new day starts over
  });

  it("keeps the count for the next flush when the counter is throttled", async () => {
    const container = fakeContainer();
    container.meta.set(`count:${DAY}`, { id: `count:${DAY}`, n: 0 });
    const item = container.item;
    let fail = true;
    container.item = (id) => {
      const real = item(id);
      return {
        ...real,
        patch: async (ops) => {
          if (fail) throw throttled();
          return real.patch(ops);
        },
      };
    };
    const allow = createDailyCeiling(container, { limit: 100, flushEvery: 2 });
    await expect(allow(DAY, 1, 1000)).rejects.toThrow("Request rate is large");
    fail = false;
    expect(await allow(DAY, 1, 2000)).toBe(true); // sync carries the first event
    expect(container.meta.get(`count:${DAY}`).n).toBe(1);
    expect(await allow(DAY, 1, 3000)).toBe(true); // 2 pending → flush
    expect(container.meta.get(`count:${DAY}`).n).toBe(3);
  });
});
