// @vitest-environment node
import { describe, it, expect } from "vitest";

const { dataBackend, writeHold } = await import("./backend.js");

describe("dataBackend", () => {
  it("defaults to appwrite when DATA_BACKEND is unset or empty", () => {
    expect(dataBackend({})).toBe("appwrite");
    expect(dataBackend({ DATA_BACKEND: "" })).toBe("appwrite");
  });

  it("returns the configured backend", () => {
    expect(dataBackend({ DATA_BACKEND: "appwrite" })).toBe("appwrite");
    expect(dataBackend({ DATA_BACKEND: "cosmos" })).toBe("cosmos");
  });

  it("throws on any other value instead of guessing", () => {
    for (const value of ["Cosmos", " cosmos", "cosmosdb", "true", "1"]) {
      expect(() => dataBackend({ DATA_BACKEND: value })).toThrow(/DATA_BACKEND must be/);
    }
  });
});

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
