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

const { rateLimitKey } = await import("./rateLimit.js");

describe("rateLimitKey", () => {
  it("keeps an IPv4 address whole", () => {
    expect(rateLimitKey("203.0.113.7")).toBe("203.0.113.7");
  });

  it("groups IPv6 addresses by their /64 prefix", () => {
    const a = rateLimitKey("2001:db8:aa:bb:1:2:3:4");
    expect(a).toBe("2001:db8:aa:bb::/64");
    expect(rateLimitKey("2001:0db8:00aa:00bb:ffff::1")).toBe(a);
    expect(rateLimitKey("2001:DB8:AA:BB::")).toBe(a);
    expect(rateLimitKey("2001:db8:aa:bc::1")).not.toBe(a);
  });

  it("expands :: before taking the prefix", () => {
    expect(rateLimitKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(rateLimitKey("::1")).toBe("0:0:0:0::/64");
    expect(rateLimitKey("2001:db8:1::5:6:7")).toBe("2001:db8:1:0::/64");
  });

  it("shares one key when there is no address", () => {
    expect(rateLimitKey(undefined)).toBe("unknown");
    expect(rateLimitKey("")).toBe("unknown");
  });
});
