import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type W = typeof window & { Paystack?: unknown; PaystackPop?: unknown };
const w = window as W;

// Inline JS v2 as Paystack ships it today: a `PaystackPop` class with
// resumeTransaction, and no `Paystack` global.
class V2Pop {
  resumeTransaction() {}
  paymentRequest() {
    return Promise.resolve();
  }
}
// Inline JS v1: an object with a static setup().
const V1Pop = { setup: () => ({ openIframe() {} }) };

/** Intercepts the injected <script> and plays out what the network does. */
function stubScript(outcome: "v2" | "v2-var" | "legacy" | "error" | "hang") {
  const append = document.body.appendChild.bind(document.body);
  type ScriptLike = {
    tagName: string;
    onload?: ((e: Event) => void) | null;
    onerror?: ((e: Event) => void) | null;
  };
  vi.spyOn(document.body, "appendChild").mockImplementation(((node: ScriptLike) => {
    const el = node;
    if (el.tagName !== "SCRIPT") return append(node as never);
    setTimeout(() => {
      if (outcome === "v2") {
        w.PaystackPop = V2Pop;
        el.onload?.(new Event("load"));
      } else if (outcome === "v2-var") {
        // Today's build opens with `var PaystackPop = ...`: a global that can
        // be reassigned but never deleted.
        Object.defineProperty(w, "PaystackPop", {
          value: V2Pop,
          writable: true,
          enumerable: true,
          configurable: false,
        });
        el.onload?.(new Event("load"));
      } else if (outcome === "legacy") {
        w.Paystack = V2Pop;
        el.onload?.(new Event("load"));
      } else if (outcome === "error") {
        el.onerror?.(new Event("error"));
      }
      // "hang": neither event ever fires.
    }, 0);
    return node;
  }) as never);
}

async function load() {
  vi.resetModules();
  return (await import("./paystackV2")).loadPaystackV2;
}

beforeEach(() => {
  delete w.Paystack;
  // The "v2-var" case leaves a global that can't be deleted.
  if (Object.getOwnPropertyDescriptor(w, "PaystackPop")?.configurable === false)
    w.PaystackPop = undefined;
  else delete w.PaystackPop;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("loadPaystackV2", () => {
  it("uses v2's PaystackPop class when there is no Paystack global", async () => {
    stubScript("v2");
    const popup = await (await load())();
    expect(typeof popup.resumeTransaction).toBe("function");
  });

  it("puts back a v1 PaystackPop that was already on the page", async () => {
    w.PaystackPop = V1Pop;
    stubScript("v2");
    const popup = await (await load())();
    expect(typeof popup.resumeTransaction).toBe("function");
    expect(w.PaystackPop).toBe(V1Pop);
  });

  it("still accepts an older build that exposes a Paystack global", async () => {
    stubScript("legacy");
    const popup = await (await load())();
    expect(typeof popup.resumeTransaction).toBe("function");
  });

  it("rejects when the script fails to load", async () => {
    stubScript("error");
    await expect((await load())()).rejects.toThrow(/Failed to load/);
  });

  it("rejects after a timeout when the script never answers, so callers can fall back", async () => {
    vi.useFakeTimers();
    stubScript("hang");
    const pending = (await load())();
    const settled = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(10_000);
    await settled;
  });

  // Runs last: it leaves a PaystackPop global that can't be deleted.
  it("resolves when v2 declares PaystackPop with var, so it can't be deleted", async () => {
    stubScript("v2-var");
    const popup = await (await load())();
    expect(typeof popup.resumeTransaction).toBe("function");
    // v1's `if (window.PaystackPop)` check must not see v2's class.
    expect(w.PaystackPop).toBeUndefined();
  });
});
