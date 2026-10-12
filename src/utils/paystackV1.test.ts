import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type W = typeof window & { PaystackPop?: unknown };
const w = window as W;

const V1Pop = { setup: () => ({ openIframe() {} }) };
class V2Pop {
  resumeTransaction() {}
}

/** Intercepts the injected <script> and plays out what the network does. */
function stubScript(outcome: "v1" | "error" | "hang") {
  const append = document.body.appendChild.bind(document.body);
  type ScriptLike = {
    tagName: string;
    onload?: ((e: Event) => void) | null;
    onerror?: ((e: Event) => void) | null;
  };
  return vi.spyOn(document.body, "appendChild").mockImplementation(((node: ScriptLike) => {
    if (node.tagName !== "SCRIPT") return append(node as never);
    setTimeout(() => {
      if (outcome === "v1") {
        w.PaystackPop = V1Pop;
        node.onload?.(new Event("load"));
      } else if (outcome === "error") {
        node.onerror?.(new Event("error"));
      }
      // "hang": neither event ever fires.
    }, 0);
    return node;
  }) as never);
}

async function load() {
  vi.resetModules();
  return (await import("./paystackV1")).loadPaystackV1;
}

beforeEach(() => {
  delete w.PaystackPop;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("loadPaystackV1", () => {
  it("returns v1's PaystackPop once the script loads", async () => {
    stubScript("v1");
    const pop = await (await load())();
    expect(pop).toBe(V1Pop);
  });

  it("reuses v1 when it is already on the page", async () => {
    w.PaystackPop = V1Pop;
    const append = stubScript("v1");
    expect(await (await load())()).toBe(V1Pop);
    expect(append).not.toHaveBeenCalled();
  });

  it("loads v1 when v2's class is on the page instead", async () => {
    w.PaystackPop = V2Pop;
    stubScript("v1");
    expect(await (await load())()).toBe(V1Pop);
  });

  it("rejects when the script fails to load", async () => {
    stubScript("error");
    await expect((await load())()).rejects.toThrow(/Failed to load/);
  });

  it("rejects after a timeout when the script never answers, so the button doesn't spin forever", async () => {
    vi.useFakeTimers();
    stubScript("hang");
    const pending = (await load())();
    const settled = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(10_000);
    await settled;
  });
});
