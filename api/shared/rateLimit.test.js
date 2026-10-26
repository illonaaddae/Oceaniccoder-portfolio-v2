// @vitest-environment node
import { describe, it, expect } from "vitest";

const { createRateLimiter } = await import("./rateLimit.js");

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
