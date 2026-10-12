import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const START = new Date("2026-10-20T09:00:00.000Z").getTime();
const MINUTE = 60 * 1000;

type Tracker = typeof import("./tracker");

interface SentPayload {
  v: number;
  sid: string;
  tz?: string;
  lang?: string;
  events: Array<Record<string, unknown>>;
}

const makeBeacon = () => vi.fn((_url: string, _data: Blob): boolean => true);
const makeFetch = () =>
  vi.fn(
    (_url: string, _init?: Parameters<typeof fetch>[1]): Promise<Response> =>
      Promise.resolve(new Response(null, { status: 204 })),
  );
let beacon = makeBeacon();
let fetchMock = makeFetch();
const listeners: Array<[string, Parameters<typeof window.addEventListener>[1]]> = [];

async function loadTracker(): Promise<Tracker> {
  vi.resetModules();
  return import("./tracker");
}

// jsdom's Blob has no text(); FileReader is how it reads one back.
function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function beaconPayloads(): Promise<SentPayload[]> {
  return Promise.all(beacon.mock.calls.map(async ([, blob]) => JSON.parse(await blobText(blob))));
}

function setNavigator(extra: Record<string, unknown>) {
  for (const [key, value] of Object.entries(extra)) {
    Object.defineProperty(window.navigator, key, { value, configurable: true });
  }
}

function setReferrer(value: string) {
  Object.defineProperty(document, "referrer", { value, configurable: true });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  vi.stubEnv("VITE_ANALYTICS_ENABLED", "true");
  beacon = makeBeacon();
  fetchMock = makeFetch();
  setNavigator({ sendBeacon: beacon, doNotTrack: null, globalPrivacyControl: undefined });
  vi.stubGlobal("fetch", fetchMock);
  setReferrer("");
  sessionStorage.clear();
  localStorage.clear();
  // Each test loads a fresh tracker module; remember its window listeners so
  // an earlier test's tracker can't answer this test's pagehide.
  const add = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    listeners.push([type, listener]);
    add(type, listener, options);
  });
});

afterEach(() => {
  for (const [type, listener] of listeners.splice(0)) {
    window.removeEventListener(type, listener);
  }
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("trackPageView", () => {
  it("beacons the landing view with its source, then later views with time on the last page", async () => {
    const { trackPageView } = await loadTracker();
    setReferrer("https://www.linkedin.com/feed/");
    trackPageView("/", "?utm_source=linkedin&utm_medium=social&utm_campaign=oct-launch");
    vi.setSystemTime(START + 42_000);
    trackPageView("/blog/my-post", "");

    expect(beacon).toHaveBeenCalledTimes(2);
    expect(beacon.mock.calls[0][0]).toBe("/api/visit");
    const [first, second] = await beaconPayloads();
    expect(first).toMatchObject({ v: 1, sid: expect.stringMatching(/^s_[A-Za-z0-9_-]{22}$/) });
    expect(first.events).toEqual([
      {
        t: "pv",
        path: "/",
        entry: true,
        ref: "www.linkedin.com",
        utm: {
          source: "linkedin",
          medium: "social",
          campaign: "oct-launch",
          term: null,
          content: null,
        },
        ch: "social",
      },
    ]);
    expect(second.sid).toBe(first.sid);
    expect(second.events).toEqual([{ t: "pv", path: "/blog/my-post", prevMs: 42_000 }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to fetch with keepalive when the beacon is refused", async () => {
    beacon.mockReturnValue(false);
    const { trackPageView } = await loadTracker();
    trackPageView("/about");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/visit");
    expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "omit" });
    expect(JSON.parse(String(init?.body)).events[0]).toMatchObject({ t: "pv", path: "/about" });
  });

  it.each([
    ["Do Not Track", { doNotTrack: "1" }],
    ["Global Privacy Control", { globalPrivacyControl: true }],
  ])("sends nothing with %s", async (_label, nav) => {
    setNavigator(nav);
    const { trackPageView, trackEvent } = await loadTracker();
    trackPageView("/");
    trackEvent("chat_open");
    window.dispatchEvent(new Event("pagehide"));
    expect(beacon).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends nothing when the build leaves it disabled", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "");
    const { trackPageView } = await loadTracker();
    trackPageView("/");
    expect(beacon).not.toHaveBeenCalled();
  });

  it.each(["/q/abc", "/pay/x", "/receipt/y", "/admin", "/admin/dashboard", "/dashboard"])(
    "never sends %s",
    async (path) => {
      const { trackPageView } = await loadTracker();
      trackPageView(path);
      expect(beacon).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("doesn't count time on an excluded page toward the next view", async () => {
    const { trackPageView } = await loadTracker();
    trackPageView("/services");
    trackPageView("/q/abc");
    vi.setSystemTime(START + 5 * MINUTE);
    trackPageView("/contact");
    const payloads = await beaconPayloads();
    expect(payloads).toHaveLength(2);
    expect(payloads[1].events[0]).toEqual({ t: "pv", path: "/contact" });
  });

  it("keeps the session within 30 idle minutes and starts a new one after", async () => {
    const { trackPageView } = await loadTracker();
    trackPageView("/");
    vi.setSystemTime(START + 29 * MINUTE);
    trackPageView("/about");
    vi.setSystemTime(START + 29 * MINUTE + 31 * MINUTE);
    trackPageView("/services");

    const [a, b, c] = await beaconPayloads();
    expect(b.sid).toBe(a.sid);
    expect(b.events[0].entry).toBeUndefined();
    expect(c.sid).not.toBe(a.sid);
    expect(c.events[0]).toEqual({ t: "pv", path: "/services", entry: true, ch: "direct" });
    expect(sessionStorage.getItem("oc_sid")).toBe(c.sid);
  });

  it("reuses a session left in sessionStorage by an earlier page load", async () => {
    sessionStorage.setItem("oc_sid", "s_AAAAAAAAAAAAAAAAAAAAAA");
    sessionStorage.setItem("oc_last", String(START - MINUTE));
    const { trackPageView } = await loadTracker();
    trackPageView("/");
    const [p] = await beaconPayloads();
    expect(p.sid).toBe("s_AAAAAAAAAAAAAAAAAAAAAA");
    expect(p.events[0].entry).toBeUndefined();
  });

  it("never throws and keeps an in-memory session when storage is blocked", async () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    vi.spyOn(window.Storage.prototype, "getItem").mockImplementation(blocked);
    vi.spyOn(window.Storage.prototype, "setItem").mockImplementation(blocked);
    const { trackPageView } = await loadTracker();
    expect(() => trackPageView("/")).not.toThrow();
    expect(() => trackPageView("/about")).not.toThrow();
    const [a, b] = await beaconPayloads();
    expect(b.sid).toBe(a.sid);
    expect(b.events[0].entry).toBeUndefined();
  });

  it("never throws when every way of sending fails", async () => {
    beacon.mockImplementation(() => {
      throw new TypeError("beacon refused");
    });
    fetchMock.mockImplementation(() => {
      throw new TypeError("fetch unavailable");
    });
    const { trackPageView, trackEvent } = await loadTracker();
    expect(() => trackPageView("/")).not.toThrow();
    expect(() => trackEvent("chat_open")).not.toThrow();
  });
});

describe("leave and events", () => {
  it("sends one leave with the time on the page when it is hidden", async () => {
    const { trackPageView } = await loadTracker();
    trackPageView("/booking");
    vi.setSystemTime(START + 30_500);
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pagehide"));
    const payloads = await beaconPayloads();
    expect(payloads).toHaveLength(2);
    expect(payloads[1].events).toEqual([{ t: "leave", path: "/booking", ms: 30_500 }]);
  });

  it("caps time on page at 30 minutes", async () => {
    const { trackPageView } = await loadTracker();
    trackPageView("/");
    vi.setSystemTime(START + 2 * 60 * MINUTE);
    window.dispatchEvent(new Event("pagehide"));
    const payloads = await beaconPayloads();
    expect(payloads[1].events[0]).toMatchObject({ t: "leave", ms: 30 * MINUTE });
  });

  it("tags events with the current page", async () => {
    const { trackPageView, trackEvent } = await loadTracker();
    trackPageView("/booking");
    trackEvent("form_submit", "booking");
    const payloads = await beaconPayloads();
    expect(payloads[1].events).toEqual([
      { t: "ev", name: "form_submit", prop: "booking", path: "/booking" },
    ]);
  });
});

describe("PageViewTracker", () => {
  it("tracks once per pathname change, not on re-renders or query changes", async () => {
    vi.resetModules();
    const trackPageView = vi.fn();
    vi.doMock("@/utils/analytics/tracker", () => ({ trackPageView }));
    const { default: PageViewTracker } = await import("@/components/PageViewTracker");

    let navigate: (to: string) => void = () => undefined;
    function NavigateHandle() {
      const nav = useNavigate();
      useEffect(() => {
        navigate = nav;
      }, [nav]);
      return null;
    }

    const tree = (
      <MemoryRouter initialEntries={["/?utm_source=linkedin"]}>
        <PageViewTracker />
        <NavigateHandle />
      </MemoryRouter>
    );
    const { rerender } = render(tree);
    expect(trackPageView).toHaveBeenCalledWith("/", "?utm_source=linkedin");

    rerender(tree);
    act(() => navigate("/about?utm_source=x"));
    act(() => navigate("/about?utm_source=y"));
    act(() => navigate("/blog"));
    expect(trackPageView.mock.calls.map(([p]) => p)).toEqual(["/", "/about", "/blog"]);
    vi.doUnmock("@/utils/analytics/tracker");
  });
});
