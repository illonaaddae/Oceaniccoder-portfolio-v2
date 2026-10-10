// @vitest-environment node
import { describe, it, expect } from "vitest";

const S = await import("./settlement.js");

describe("mapPaystackStatus", () => {
  it.each([
    ["success", "success"],
    ["failed", "failed"],
    ["reversed", "failed"],
    ["abandoned", "pending"],
    ["ongoing", "pending"],
    [undefined, "pending"],
  ])("%s → %s", (input, out) => expect(S.mapPaystackStatus(input)).toBe(out));
});

describe("checkSettlement", () => {
  const ok = { expectedMinor: 6000, expectedCurrency: "GHS", paidMinor: 6000, paidCurrency: "GHS" };
  it("settles only an exact match", () => expect(S.checkSettlement(ok)).toEqual({ ok: true }));
  it.each([
    [{ expectedMinor: 0 }, "no-expected-amount"],
    [{ paidCurrency: "USD" }, "currency-mismatch"],
    [{ paidMinor: 5999 }, "underpaid"],
    [{ paidMinor: 6001 }, "overpaid"],
  ])("%j → %s", (over, reason) =>
    expect(S.checkSettlement({ ...ok, ...over })).toEqual({ ok: false, reason }),
  );
});

describe("methodFromChannel", () => {
  it.each([
    ["card", "card"],
    ["mobile_money", "momo"],
    ["bank_transfer", "bank"],
    ["apple_pay", "apple_pay"],
    ["", "card"],
  ])("%s → %s", (channel, method) => expect(S.methodFromChannel(channel)).toBe(method));
});

describe("keyMode", () => {
  it("reads the key prefix", () => {
    expect(S.keyMode("sk_live_x")).toBe("live");
    expect(S.keyMode("sk_test_x")).toBe("test");
    expect(S.keyMode("")).toBe("unknown");
  });
});
