import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prefetchRoutes } from "./prefetchRoutes";

type Mutable = Record<string, unknown>;

describe("prefetchRoutes", () => {
  let originalConnection: unknown;
  let hadConnection: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    hadConnection = "connection" in navigator;
    originalConnection = (navigator as unknown as Mutable).connection;
    // No requestIdleCallback in jsdom, so the setTimeout fallback is exercised.
    delete (window as unknown as Mutable).requestIdleCallback;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (hadConnection) {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: originalConnection,
      });
    } else {
      delete (navigator as unknown as Mutable).connection;
    }
    vi.restoreAllMocks();
  });

  function setConnection(value: unknown) {
    Object.defineProperty(navigator, "connection", { configurable: true, value });
  }

  it("loads every route, one per idle slot", async () => {
    setConnection(undefined);
    const calls: string[] = [];
    const loaders = ["a", "b", "c"].map(
      (name) => () =>
        Promise.resolve().then(() => {
          calls.push(name);
        }),
    );

    prefetchRoutes(loaders);
    expect(calls).toEqual([]); // nothing before the first idle slot

    // Each loader needs its timer to fire, then its promise to settle.
    for (let i = 0; i < loaders.length; i += 1) {
      await vi.advanceTimersByTimeAsync(3000);
    }

    expect(calls).toEqual(["a", "b", "c"]);
  });

  // Prefetching is an optimisation; it must never spend a metered connection.
  it("does nothing when Save-Data is enabled", async () => {
    setConnection({ saveData: true, effectiveType: "4g" });
    const loader = vi.fn(() => Promise.resolve());

    prefetchRoutes([loader]);
    await vi.advanceTimersByTimeAsync(10000);

    expect(loader).not.toHaveBeenCalled();
  });

  it("does nothing on a 2G connection", async () => {
    setConnection({ saveData: false, effectiveType: "slow-2g" });
    const loader = vi.fn(() => Promise.resolve());

    prefetchRoutes([loader]);
    await vi.advanceTimersByTimeAsync(10000);

    expect(loader).not.toHaveBeenCalled();
  });

  it("prefetches on 4g", async () => {
    setConnection({ saveData: false, effectiveType: "4g" });
    const loader = vi.fn(() => Promise.resolve());

    prefetchRoutes([loader]);
    await vi.advanceTimersByTimeAsync(3000);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  // One bad chunk must not stall the queue behind it.
  it("continues past a failing loader", async () => {
    setConnection(undefined);
    const failing = vi.fn(() => Promise.reject(new Error("404")));
    const following = vi.fn(() => Promise.resolve());

    prefetchRoutes([failing, following]);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);

    expect(failing).toHaveBeenCalledTimes(1);
    expect(following).toHaveBeenCalledTimes(1);
  });
});
