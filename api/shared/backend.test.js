// @vitest-environment node
import { describe, it, expect } from "vitest";

const { writeHold } = await import("./backend.js");

describe("writeHold", () => {
  it("is on for '1' and off when unset, empty or '0'", () => {
    expect(writeHold({ WRITE_HOLD: "1" })).toBe(true);
    expect(writeHold({})).toBe(false);
    for (const value of [undefined, "", "0"]) {
      expect(writeHold({ WRITE_HOLD: value })).toBe(false);
    }
  });

  it("throws on any other value, so a typo fails closed", () => {
    for (const value of ["true", "yes", " 1", "1 ", "on", "false"]) {
      expect(() => writeHold({ WRITE_HOLD: value })).toThrow(/WRITE_HOLD must be/);
    }
  });
});
