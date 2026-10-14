import { describe, it, expect } from "vitest";
import { getStatusColor } from "./projectsUtils";

// Both themes use a solid fill so the image underneath can't lower contrast:
// light is 700 text on the 100 fill, dark is 400 text on gray-900.
describe("getStatusColor", () => {
  it.each([
    ["Completed", "success"],
    ["In Progress", "warning"],
    ["Planning", "info"],
    ["Archived", "gray"],
  ])("%s badge has a solid fill in both themes", (status, hue) => {
    const classes = getStatusColor(status).split(" ");
    expect(classes).toEqual(
      expect.arrayContaining([
        `text-${hue}-700`,
        `bg-${hue}-100`,
        `dark:text-${hue}-400`,
        "dark:bg-gray-900",
      ]),
    );
    expect(classes).not.toContain(`text-${hue}-400`);
    expect(classes.filter((c) => c.includes("/10"))).toEqual([]);
  });
});
