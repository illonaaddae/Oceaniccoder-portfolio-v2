import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lazyWithReload } from "./lazyWithReload";

// React.lazy defers the factory until render. These tests exercise the recovery
// logic directly by reaching for the internal payload React attaches, which
// keeps them focused on the reload decision rather than on rendering.
type LazyInternals = { _payload: { _result: () => Promise<unknown> } };

function invokeFactory(component: unknown): Promise<unknown> {
  const internals = component as unknown as LazyInternals;
  return internals._payload._result();
}

const CHUNK_ERROR = new Error("Failed to fetch dynamically imported module: /assets/Foo-abc123.js");

describe("lazyWithReload", () => {
  let reload: ReturnType<typeof vi.fn>;
  let originalLocation: typeof window.location;

  beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("passes a successful import straight through", async () => {
    const module = { default: () => null };
    const component = lazyWithReload("Ok", () => Promise.resolve(module));

    await expect(invokeFactory(component)).resolves.toBe(module);
    expect(reload).not.toHaveBeenCalled();
  });

  // The actual bug: a tab open across a deploy points at a deleted chunk hash.
  it("reloads once when the chunk is gone", async () => {
    const component = lazyWithReload("Stale", () => Promise.reject(CHUNK_ERROR));

    // Never settles — the reload takes over — so assert on the side effect.
    void invokeFactory(component);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  // Without this guard a genuinely missing chunk would reload forever.
  it("does not reload a second time for the same chunk", async () => {
    const first = lazyWithReload("Loop", () => Promise.reject(CHUNK_ERROR));
    void invokeFactory(first);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

    const second = lazyWithReload("Loop", () => Promise.reject(CHUNK_ERROR));
    await expect(invokeFactory(second)).rejects.toThrow(/dynamically imported module/);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  // A component that throws at import time is a real bug; reloading would hide
  // it behind an infinite-looking refresh instead of surfacing the error.
  it("rethrows a non-chunk error without reloading", async () => {
    const bug = new Error("Cannot read properties of undefined (reading 'map')");
    const component = lazyWithReload("RealBug", () => Promise.reject(bug));

    await expect(invokeFactory(component)).rejects.toBe(bug);
    expect(reload).not.toHaveBeenCalled();
  });

  it("clears the flag after a recovery, so a later deploy gets its own attempt", async () => {
    const failing = lazyWithReload("Recovers", () => Promise.reject(CHUNK_ERROR));
    void invokeFactory(failing);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

    const module = { default: () => null };
    const succeeding = lazyWithReload("Recovers", () => Promise.resolve(module));
    await expect(invokeFactory(succeeding)).resolves.toBe(module);

    // Flag released — a future stale chunk may reload again.
    const failingAgain = lazyWithReload("Recovers", () => Promise.reject(CHUNK_ERROR));
    void invokeFactory(failingAgain);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
  });
});
