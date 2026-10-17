// @vitest-environment node
import { describe, it, expect } from "vitest";

const { CONTAINERS } = await import("./cosmos.js");

describe("CONTAINERS", () => {
  it("stays within the 25-container limit of a shared-throughput database", () => {
    expect(Object.keys(CONTAINERS).length).toBeLessThanOrEqual(25);
  });

  it("declares quotes and locks by id, imported but not managed", () => {
    for (const name of ["quotes", "locks"]) {
      expect(CONTAINERS[name]).toEqual({ partitionKey: "/id", manage: false });
    }
  });
});
