// @vitest-environment node
import { describe, it, expect } from "vitest";

const T = await import("./tokens.js");

describe("tokens", () => {
  it("creates url-safe 256-bit tokens that pass the shape check", () => {
    const t = T.newToken();
    expect(t).toHaveLength(43);
    expect(T.isTokenShape(t)).toBe(true);
    expect(T.newToken()).not.toBe(t);
  });
  it.each(["", "short", "has spaces in it but is long enough to pass length....", null, 42])(
    "rejects %j",
    (t) => expect(T.isTokenShape(t)).toBe(false),
  );
  it("hashes to stable hex", () => {
    expect(T.hashToken("abc")).toBe(T.hashToken("abc"));
    expect(T.hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("hashes IPs with a prefix and returns empty for none", () => {
    expect(T.hashIp("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
    expect(T.hashIp("1.2.3.4")).not.toBe(T.hashToken("1.2.3.4"));
    expect(T.hashIp(undefined)).toBe("");
  });
});

describe("receipt signatures", () => {
  it("verifies its own signature and rejects others", () => {
    const sig = T.signReceipt("Q-2026-0001-1-ABCDEFGH", "secret");
    expect(sig).toHaveLength(32);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGH", sig, "secret")).toBe(true);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGX", sig, "secret")).toBe(false);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGH", sig, "other")).toBe(false);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGH", "short", "secret")).toBe(false);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGH", sig, "")).toBe(false);
  });
});

describe("lockId", () => {
  it("fits Appwrite's 36-char id rules", () => {
    const id = T.lockId("stage:abc:deposit");
    expect(id).toMatch(/^s_[0-9a-f]{34}$/);
    expect(id).toHaveLength(36);
  });
});
