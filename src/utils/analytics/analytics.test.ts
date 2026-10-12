import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoutesFromElements } from "react-router-dom";
import publicRoutes from "@/routes/publicRoutes";
import { trackingAllowed, optOutOfTracking } from "./consent";
import { normalisePath, isExcluded, NOT_FOUND_PATH, TRACKED_ROUTES } from "./routes";
import { classify, externalReferrerHost, parseUtm, type Utm } from "./channel";

const utm = (fields: Partial<Utm>): Utm => ({
  source: null,
  medium: null,
  campaign: null,
  term: null,
  content: null,
  ...fields,
});

describe("trackingAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const stubNavigator = (extra: Record<string, unknown>) =>
    vi.stubGlobal("navigator", { ...window.navigator, language: "en-GB", ...extra });

  it("is off unless the build enables it", () => {
    expect(trackingAllowed()).toBe(false);
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "false");
    expect(trackingAllowed()).toBe(false);
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "true");
    expect(trackingAllowed()).toBe(true);
  });

  it.each([
    ["Do Not Track", { doNotTrack: "1" }],
    ["Global Privacy Control", { globalPrivacyControl: true }],
    ["an automated browser", { webdriver: true }],
  ])("is off for %s", (_label, nav) => {
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "true");
    stubNavigator(nav);
    expect(trackingAllowed()).toBe(false);
  });

  it("is off in the owner's browser once flagged", () => {
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "true");
    optOutOfTracking();
    expect(localStorage.getItem("oc_notrack")).toBe("1");
    expect(trackingAllowed()).toBe(false);
  });

  it("survives blocked storage", () => {
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "true");
    vi.spyOn(window.Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(window.Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => optOutOfTracking()).not.toThrow();
    expect(trackingAllowed()).toBe(true);
  });
});

describe("normalisePath", () => {
  it.each([
    ["/", "/"],
    ["/about", "/about"],
    ["/about/", "/about"],
    ["/Blog/My-Post", "/blog/my-post"],
    ["/projects/craigtec?ref=x#top", "/projects/craigtec"],
    ["/no-such-page", NOT_FOUND_PATH],
    ["/blog/a/b", NOT_FOUND_PATH],
  ])("%s → %s", (input, expected) => {
    expect(normalisePath(input)).toBe(expected);
  });

  it.each([
    "/q/abc",
    "/q/abc/pay/stage-1",
    "/Q/ABC",
    "/pay/x",
    "/receipt/y",
    "/admin",
    "/admin/dashboard",
    "/dashboard",
  ])("never emits %s", (input) => {
    expect(isExcluded(input)).toBe(true);
    expect(normalisePath(input)).toBeNull();
  });

  it("drops paths outside the allowed characters or too long", () => {
    expect(normalisePath("/blog/hello.world")).toBeNull();
    expect(normalisePath(`/blog/${"a".repeat(150)}`)).toBeNull();
  });

  it("keeps public paths that merely contain an excluded word", () => {
    expect(normalisePath("/blog/q")).toBe("/blog/q");
    expect(normalisePath("/projects/pay-app")).toBe("/projects/pay-app");
  });

  // Fails when a public route is added or renamed without updating TRACKED_ROUTES.
  it("matches the public routes, minus client documents and the catch-all", () => {
    const paths = createRoutesFromElements(publicRoutes)
      .map((r) => r.path ?? "")
      .filter((p) => p !== "*" && !isExcluded(p));
    expect(paths.sort()).toEqual([...TRACKED_ROUTES].sort());
  });
});

describe("externalReferrerHost", () => {
  it.each([
    ["https://www.linkedin.com/feed/", "www.linkedin.com"],
    ["https://t.co/abc", "t.co"],
    ["https://oceaniccoder.dev/blog", null],
    ["https://www.oceaniccoder.dev/", null],
    ["android-app://com.google.android.gm/", null],
    ["", null],
    ["not a url", null],
  ])("%s → %s", (referrer, expected) => {
    expect(externalReferrerHost(referrer, "oceaniccoder.dev")).toBe(expected);
  });
});

describe("parseUtm", () => {
  it("reads, trims and lowercases the five tags", () => {
    expect(
      parseUtm("?utm_source=LinkedIn&utm_medium=%20social%20&utm_campaign=oct-launch"),
    ).toEqual(utm({ source: "linkedin", medium: "social", campaign: "oct-launch" }));
  });

  it("returns null without tags and caps long values", () => {
    expect(parseUtm("?ref=x")).toBeNull();
    expect(parseUtm("")).toBeNull();
    expect(parseUtm(`?utm_source=${"a".repeat(200)}`)?.source).toHaveLength(100);
  });

  it("strips control characters", () => {
    expect(parseUtm("?utm_source=a%0Ab")?.source).toBe("ab");
  });
});

describe("classify", () => {
  it.each([
    [{ refHost: null, utm: null }, "direct"],
    [{ refHost: "www.google.com", utm: null }, "search"],
    [{ refHost: "www.google.com.gh", utm: null }, "search"],
    [{ refHost: "duckduckgo.com", utm: null }, "search"],
    [{ refHost: "www.bing.com", utm: null }, "search"],
    [{ refHost: "www.linkedin.com", utm: null }, "social"],
    [{ refHost: "lnkd.in", utm: null }, "social"],
    [{ refHost: "t.co", utm: null }, "social"],
    [{ refHost: "mail.google.com", utm: null }, "email"],
    [{ refHost: "dev.to", utm: null }, "referral"],
    [{ refHost: null, utm: utm({ medium: "cpc" }) }, "paid"],
    [{ refHost: "www.google.com", utm: utm({ medium: "ppc" }) }, "paid"],
    [{ refHost: null, utm: utm({ medium: "newsletter" }) }, "email"],
    [{ refHost: null, utm: utm({ source: "linkedin" }) }, "social"],
    [{ refHost: null, utm: utm({ source: "partner-site" }) }, "direct"],
  ] as const)("%j → %s", (input, expected) => {
    expect(classify(input)).toBe(expected);
  });
});
