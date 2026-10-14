import { describe, it, expect } from "vitest";
import { getNavActiveClass } from "./navData";

describe("getNavActiveClass", () => {
  // oceanic-500 on its own 20% tint over the dark navbar measured 3.7:1.
  it("uses oceanic-400 text for the dark-theme active link", () => {
    expect(getNavActiveClass("dark").split(" ")).toContain("text-oceanic-400");
    expect(getNavActiveClass("dark").split(" ")).not.toContain("text-oceanic-500");
  });
});
