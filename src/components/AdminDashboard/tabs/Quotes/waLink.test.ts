import { describe, it, expect } from "vitest";
import { waLink } from "./QuoteDetail";

const num = (url: string) => new URL(url).pathname.slice(1);

describe("waLink", () => {
  it("turns a local Ghana number into the international form", () => {
    expect(num(waLink("024 123 4567", "hi"))).toBe("233241234567");
  });
  it("keeps a number that already has its country code", () => {
    expect(num(waLink("+233 24 123 4567", "hi"))).toBe("233241234567");
    expect(num(waLink("+49 151 2345 6789", "hi"))).toBe("4915123456789");
  });
  it("drops a leading 00 international prefix", () => {
    expect(num(waLink("0049 151 2345 6789", "hi"))).toBe("4915123456789");
  });
  it("falls back to the contact picker with no number", () => {
    expect(num(waLink("", "hi"))).toBe("");
    expect(num(waLink(null, "hi"))).toBe("");
  });
  it("encodes the message", () => {
    expect(new URL(waLink("0241234567", "Hi Kofi & co")).searchParams.get("text")).toBe(
      "Hi Kofi & co",
    );
  });
});
