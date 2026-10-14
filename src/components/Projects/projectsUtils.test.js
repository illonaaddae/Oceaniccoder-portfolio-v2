import { describe, it, expect } from "vitest";
import { getStatusColor } from "./projectsUtils";

// Light theme: 700 text on a solid 100 fill (AA whatever the image underneath).
// Dark theme keeps 400 text on a 10% tint.
describe("getStatusColor", () => {
  it.each([
    ["Completed", "success"],
    ["In Progress", "warning"],
    ["Planning", "info"],
    ["Archived", "gray"],
  ])("%s badge uses solid light-theme colours and the dark-theme tint", (status, hue) => {
    const classes = getStatusColor(status).split(" ");
    expect(classes).toEqual(
      expect.arrayContaining([`text-${hue}-700`, `bg-${hue}-100`, `dark:text-${hue}-400`]),
    );
    expect(classes).not.toContain(`text-${hue}-400`);
  });
});
