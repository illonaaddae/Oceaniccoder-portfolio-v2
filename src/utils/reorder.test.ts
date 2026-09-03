import { describe, it, expect } from "vitest";
import { moveItem } from "./reorder";

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  it("moves an item down the list", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item up the list", () => {
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("swaps neighbours", () => {
    expect(moveItem(list, 1, 2)).toEqual(["a", "c", "b", "d"]);
  });

  it("returns the same list when the position does not change", () => {
    expect(moveItem(list, 1, 1)).toBe(list);
  });

  it("ignores out-of-range positions", () => {
    expect(moveItem(list, -1, 2)).toBe(list);
    expect(moveItem(list, 0, 9)).toBe(list);
  });

  it("does not mutate the original list", () => {
    const original = [...list];
    moveItem(list, 0, 3);
    expect(list).toEqual(original);
  });
});
