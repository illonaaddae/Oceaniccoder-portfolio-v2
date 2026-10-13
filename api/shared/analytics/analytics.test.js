// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { allowedHosts, allowedOrigin, headerDropReason, isExcludedPath, validatePayload } =
  await import("./validate.js");
const { isBot, parseUserAgent } = await import("./ua.js");
const { tzCountry } = await import("./tzCountry.js");
const { createSaltStore, visitorHash, SALT_TTL_SECONDS } = await import("./visitor.js");
const { ANALYTICS_CLIENT_OPTIONS, CONTAINERS } = await import("../cosmos.js");

const SID = "s_3q8Zr0kD2m1xVb7YtQ9wLw";
const pv = (extra = {}) => ({ t: "pv", path: "/blog/my-post", ...extra });
const body = (events, extra = {}) => ({ v: 1, sid: SID, events, ...extra });

describe("validatePayload", () => {
  it("accepts an entry page view and keeps its source in the stored shape", () => {
    const out = validatePayload(
      body(
        [
          pv({
            entry: true,
            ref: "www.linkedin.com",
            ch: "social",
            utm: { source: "linkedin", medium: "social", campaign: "oct-2026" },
            prevMs: 42000,
          }),
        ],
        { tz: "Africa/Accra", lang: "en-GB" },
      ),
    );
    expect(out).toEqual({
      sid: SID,
      tz: "Africa/Accra",
      lang: "en",
      events: [
        {
          type: "pv",
          path: "/blog/my-post",
          entry: true,
          ref: "www.linkedin.com",
          ch: "social",
          utm: { s: "linkedin", m: "social", c: "oct-2026" },
          prevMs: 42000,
        },
      ],
    });
  });

  it("drops source fields from a page view that isn't the session's first", () => {
    const out = validatePayload(body([pv({ ref: "t.co", ch: "social" })]));
    expect(out.events[0]).toEqual({ type: "pv", path: "/blog/my-post", entry: false });
  });

  it("accepts allow-listed events and leave timings", () => {
    const out = validatePayload(
      body([
        { t: "ev", name: "form_submit", prop: "booking", path: "/booking" },
        { t: "ev", name: "chat_open", path: "/" },
        { t: "leave", path: "/booking", ms: 30500 },
      ]),
    );
    expect(out.events).toEqual([
      { type: "ev", name: "form_submit", prop: "booking", path: "/booking" },
      { type: "ev", name: "chat_open", prop: null, path: "/" },
      { type: "leave", path: "/booking", ms: 30500 },
    ]);
  });

  it.each(["/(404)", "/", "/about", "/projects/craigtec", "/blog/my-post", "/inquiry"])(
    "accepts the public path %s",
    (path) => {
      expect(validatePayload(body([pv({ path })]))).not.toBeNull();
    },
  );

  it("accepts up to five events", () => {
    expect(validatePayload(body(Array.from({ length: 5 }, () => pv())))).not.toBeNull();
  });

  it("accepts campaign-style UTM values", () => {
    const utm = { source: "news.letter", medium: "e-mail+promo", campaign: "q4_2026" };
    expect(validatePayload(body([pv({ entry: true, utm })])).events[0].utm).toEqual({
      s: "news.letter",
      m: "e-mail+promo",
      c: "q4_2026",
    });
  });

  it.each([
    ["not an object", "hello"],
    ["an array", [pv()]],
    ["wrong version", body([pv()], { v: 2 })],
    ["unknown top-level key", body([pv()], { ip: "1.2.3.4" })],
    ["bad sid", body([pv()], { sid: "abc" })],
    ["bad lang", body([pv()], { lang: "english" })],
    ["long tz", body([pv()], { tz: "x".repeat(65) })],
    ["no events", body([])],
    ["more than 5 events", body(Array.from({ length: 6 }, () => pv()))],
    ["unknown event type", body([{ t: "click", path: "/" }])],
    ["prototype event type", body([{ t: "constructor", path: "/" }])],
    ["unknown event key", body([pv({ ua: "Mozilla" })])],
    ["uppercase path", body([pv({ path: "/Blog" })])],
    ["path with a query", body([pv({ path: "/blog?x=1" })])],
    ["path too long", body([pv({ path: `/${"a".repeat(150)}` })])],
    ["client quote path", body([pv({ path: "/q/abc123" })])],
    ["client pay path", body([pv({ path: "/pay/inv-001" })])],
    ["receipt path", body([pv({ path: "/receipt/ref1" })])],
    ["admin path", body([pv({ path: "/admin/dashboard" })])],
    ["dashboard path", body([pv({ path: "/dashboard" })])],
    ["empty segment", body([pv({ path: "/blog//my-post" })])],
    ["trailing slash", body([pv({ path: "/about/" })])],
    ["path outside the route templates", body([pv({ path: "/buy-cheap-pills" })])],
    ["too many segments", body([pv({ path: "/blog/a/b" })])],
    ["utm_term", body([pv({ entry: true, utm: { term: "x" } })])],
    ["utm_content", body([pv({ entry: true, utm: { content: "x" } })])],
    ["email in utm", body([pv({ entry: true, utm: { source: "ama@example.com" } })])],
    ["phone number in utm", body([pv({ entry: true, utm: { campaign: "call-0244123456" } })])],
    ["uppercase utm", body([pv({ entry: true, utm: { source: "LinkedIn" } })])],
    ["space in utm", body([pv({ entry: true, utm: { campaign: "oct launch" } })])],
    ["bad channel", body([pv({ entry: true, ch: "tv" })])],
    ["bad referrer host", body([pv({ entry: true, ref: "https://x.com/a" })])],
    ["unknown utm key", body([pv({ entry: true, utm: { id: "1" } })])],
    ["long utm value", body([pv({ entry: true, utm: { source: "x".repeat(101) } })])],
    ["control chars in utm", body([pv({ entry: true, utm: { source: "a\nb" } })])],
    ["prevMs over 30 min", body([pv({ prevMs: 1_800_001 })])],
    ["negative leave", body([{ t: "leave", path: "/", ms: -1 }])],
    ["event not allow-listed", body([{ t: "ev", name: "scroll", path: "/" }])],
    ["bad form type", body([{ t: "ev", name: "form_submit", prop: "spam", path: "/" }])],
    ["prop on a prop-less event", body([{ t: "ev", name: "chat_open", prop: "x", path: "/" }])],
  ])("rejects %s", (_label, input) => {
    expect(validatePayload(input)).toBeNull();
  });
});

describe("isExcludedPath", () => {
  it.each([
    "/q/abc",
    "/q",
    "/pay/x",
    "/receipt/y",
    "/admin",
    "/admin/reset-password",
    "/dashboard",
  ])("excludes %s", (path) => expect(isExcludedPath(path)).toBe(true));

  it.each(["/", "/blog/q", "/projects/pay-app", "/services"])("keeps %s", (path) =>
    expect(isExcludedPath(path)).toBe(false),
  );
});

describe("request checks", () => {
  const prod = {};
  const local = { AZURE_FUNCTIONS_ENVIRONMENT: "Development" };

  it("allows the production hosts by default and localhost only off production", () => {
    expect([...allowedHosts(prod)]).toEqual(["oceaniccoder.dev", "www.oceaniccoder.dev"]);
    expect(allowedHosts(local).has("localhost")).toBe(true);
    expect(allowedHosts(prod).has("localhost")).toBe(false);
  });

  it("reads ANALYTICS_ALLOWED_HOSTS when set", () => {
    const hosts = allowedHosts({ ANALYTICS_ALLOWED_HOSTS: " Example.com , preview.example.com" });
    expect([...hosts]).toEqual(["example.com", "preview.example.com"]);
  });

  it("matches Origin, falls back to Referer, and refuses neither", () => {
    const hosts = allowedHosts(prod);
    expect(allowedOrigin({ origin: "https://oceaniccoder.dev" }, hosts)).toBe("oceaniccoder.dev");
    expect(allowedOrigin({ referer: "https://www.oceaniccoder.dev/blog" }, hosts)).toBe(
      "www.oceaniccoder.dev",
    );
    expect(allowedOrigin({ origin: "https://evil.example" }, hosts)).toBeNull();
    expect(allowedOrigin({ origin: "http://localhost:5173" }, hosts)).toBeNull();
    expect(allowedOrigin({ origin: "null" }, hosts)).toBeNull();
    expect(allowedOrigin({}, hosts)).toBeNull();
  });

  it("drops DNT, GPC and cross-site fetches", () => {
    expect(headerDropReason({ dnt: "1" }, prod)).toBe("dnt");
    expect(headerDropReason({ "sec-gpc": "1" }, prod)).toBe("dnt");
    expect(headerDropReason({ "sec-fetch-site": "cross-site" }, prod)).toBe("cross-site");
    expect(headerDropReason({ "sec-fetch-site": "same-site" }, prod)).toBe("cross-site");
    expect(headerDropReason({ "sec-fetch-site": "same-site" }, local)).toBeNull();
    expect(headerDropReason({ "sec-fetch-site": "same-origin", dnt: "0" }, prod)).toBeNull();
  });
});

describe("ua", () => {
  const CHROME_ANDROID =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
  const SAFARI_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1";
  const EDGE_WINDOWS =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0";
  const FIREFOX_MAC =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0";
  const SAMSUNG_TABLET =
    "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Safari/537.36";

  it.each([
    [CHROME_ANDROID, { dev: "mobile", br: "chrome", os: "android" }],
    [SAFARI_IPHONE, { dev: "mobile", br: "safari", os: "ios" }],
    [EDGE_WINDOWS, { dev: "desktop", br: "edge", os: "windows" }],
    [FIREFOX_MAC, { dev: "desktop", br: "firefox", os: "macos" }],
    [SAMSUNG_TABLET, { dev: "tablet", br: "samsung", os: "android" }],
    ["something odd", { dev: "desktop", br: "other", os: "other" }],
    // Cubot handsets: "bot" inside a model name is not a crawler.
    [
      "Mozilla/5.0 (Linux; Android 11; CUBOT KINGKONG 5 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36",
      { dev: "mobile", br: "chrome", os: "android" },
    ],
    [
      "Mozilla/5.0 (Linux; Android 10; CUBOT_X30 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      { dev: "mobile", br: "chrome", os: "android" },
    ],
  ])("parses %s", (ua, expected) => {
    expect(parseUserAgent(ua)).toEqual(expected);
    expect(isBot(ua)).toBe(false);
  });

  it.each([
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome-Lighthouse",
    "facebookexternalhit/1.1",
    "curl/8.7.1",
    "python-requests/2.32",
    "axios/1.7.7",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
    "TelegramBot (like TwitterBot)",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)",
    "Some monitoring bot",
    "",
    "   ",
    undefined,
  ])("flags %j as a bot", (ua) => {
    expect(isBot(ua)).toBe(true);
  });
});

describe("tzCountry", () => {
  it.each([
    ["Africa/Accra", "GH"],
    ["Europe/London", "GB"],
    ["America/New_York", "US"],
    ["Asia/Calcutta", "IN"],
    ["Asia/Kolkata", "IN"],
    ["Europe/Kiev", "UA"],
  ])("maps %s to %s", (zone, cc) => expect(tzCountry(zone)).toBe(cc));

  it.each(["UTC", "Etc/GMT+1", "Mars/Olympus", "", null, 42])("returns null for %j", (zone) =>
    expect(tzCountry(zone)).toBeNull(),
  );
});

describe("visitor hash", () => {
  function fakeContainer() {
    const docs = new Map();
    return {
      docs,
      item: (id) => ({
        read: vi.fn(async () => ({ resource: docs.get(id) })),
      }),
      items: {
        create: vi.fn(async (doc) => {
          if (docs.has(doc.id)) throw Object.assign(new Error("conflict"), { code: 409 });
          docs.set(doc.id, doc);
          return { resource: doc };
        }),
      },
    };
  }
  const who = { ip: "203.0.113.7", ua: "Mozilla/5.0", host: "oceaniccoder.dev" };

  it("is stable within a day and rotates with the next day's salt", async () => {
    const getSalt = createSaltStore(fakeContainer());
    const today = visitorHash(await getSalt("2026-10-20"), who);
    expect(visitorHash(await getSalt("2026-10-20"), who)).toBe(today);
    expect(today).toMatch(/^[0-9a-f]{16}$/);
    const tomorrow = visitorHash(await getSalt("2026-10-21"), who);
    expect(tomorrow).not.toBe(today);
  });

  it("never contains the raw IP or UA and differs per visitor", async () => {
    const salt = await createSaltStore(fakeContainer())("2026-10-20");
    const hash = visitorHash(salt, who);
    expect(hash).not.toContain("203");
    expect(visitorHash(salt, { ...who, ip: "203.0.113.8" })).not.toBe(hash);
  });

  it("stores the salt with a 48-hour ttl and reuses it from memory", async () => {
    const container = fakeContainer();
    const getSalt = createSaltStore(container);
    await getSalt("2026-10-20");
    await getSalt("2026-10-20");
    expect(container.items.create).toHaveBeenCalledTimes(1);
    expect(container.docs.get("salt:2026-10-20")).toMatchObject({
      type: "salt",
      day: "2026-10-20",
      ttl: SALT_TTL_SECONDS,
    });
    expect(SALT_TTL_SECONDS).toBe(172800);
  });

  it("re-reads the winner's salt after a create race (409)", async () => {
    const container = fakeContainer();
    const winner = { id: "salt:2026-10-20", salt: "winner-salt" };
    let reads = 0;
    container.item = () => ({
      read: async () => ({ resource: reads++ === 0 ? undefined : winner }),
    });
    container.items.create = vi.fn(async () => {
      throw Object.assign(new Error("conflict"), { code: 409 });
    });
    expect(await createSaltStore(container)("2026-10-20")).toBe("winner-salt");
  });

  it("propagates a salt read failure instead of hashing without one", async () => {
    const container = fakeContainer();
    container.item = () => ({
      read: async () => {
        throw Object.assign(new Error("unavailable"), { code: 503 });
      },
    });
    await expect(createSaltStore(container)("2026-10-20")).rejects.toThrow("unavailable");
    expect(() => visitorHash(undefined, who)).toThrow();
  });

  it("shares one load between concurrent first requests of a day", async () => {
    const container = fakeContainer();
    const getSalt = createSaltStore(container);
    const [a, b, c] = await Promise.all([
      getSalt("2026-10-20"),
      getSalt("2026-10-20"),
      getSalt("2026-10-20"),
    ]);
    expect(container.items.create).toHaveBeenCalledTimes(1);
    expect(new Set([a, b, c]).size).toBe(1);
  });

  it("forgets a failed load so the next request retries", async () => {
    const container = fakeContainer();
    let down = true;
    const item = container.item;
    container.item = (id) => ({
      read: async () => {
        if (down) throw Object.assign(new Error("unavailable"), { code: 503 });
        return item(id).read();
      },
    });
    const getSalt = createSaltStore(container);
    await expect(getSalt("2026-10-20")).rejects.toThrow("unavailable");
    down = false;
    expect(await getSalt("2026-10-20")).toEqual(expect.any(String));
  });
});

describe("analytics Cosmos client", () => {
  it("never retries a throttled write and gives up quickly", () => {
    expect(ANALYTICS_CLIENT_OPTIONS.connectionPolicy.retryOptions).toEqual({
      maxRetryAttemptCount: 0,
      fixedRetryIntervalInMilliseconds: 0,
      maxWaitTimeInSeconds: 1,
    });
    expect(ANALYTICS_CLIENT_OPTIONS.connectionPolicy.requestTimeout).toBeLessThanOrEqual(5000);
  });

  it("declares the analytics container with TTL on and lean indexing", () => {
    expect(CONTAINERS.analytics).toMatchObject({
      partitionKey: "/day",
      defaultTtl: -1,
      imported: false,
      indexingPolicy: { excludedPaths: [{ path: "/*" }] },
    });
  });
});
