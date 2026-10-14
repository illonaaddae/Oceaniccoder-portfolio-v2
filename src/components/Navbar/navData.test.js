import { describe, it, expect } from "vitest";
import {
  getMobileActiveClass,
  getMobileInactiveClass,
  getNavActiveClass,
  getNavInactiveClass,
} from "./navData";

// oceanic-500 text on the dark navbar or menu measured 3.7-4.0:1 (AA needs
// 4.5:1 for this text); oceanic-400 is 5.7-6.3:1.
describe.each([
  ["desktop active", getNavActiveClass, "text-oceanic-400"],
  ["desktop hover", getNavInactiveClass, "hover:text-oceanic-400"],
  ["mobile active", getMobileActiveClass, "text-oceanic-400"],
  ["mobile hover", getMobileInactiveClass, "hover:text-oceanic-400"],
])("dark-theme %s link", (_, getClass, expected) => {
  it(`uses ${expected}, not oceanic-500`, () => {
    const classes = getClass("dark").split(" ");
    expect(classes).toContain(expected);
    expect(classes.filter((c) => c.endsWith("text-oceanic-500"))).toEqual([]);
  });
});
