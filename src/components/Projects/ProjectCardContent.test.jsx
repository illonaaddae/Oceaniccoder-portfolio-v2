import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProjectCardContent from "./ProjectCardContent";

const project = {
  category: "Full Stack",
  year: "2026",
  title: "Demo",
  description: "A demo project",
  technologies: [],
};

// The card is white in light theme (#ffffff) and dark in dark theme (#131c2e).
// oceanic-500 failed AA on the dark card (3.9:1) and oceanic-400 fails on white
// (2.8:1), so each theme gets its own colour: accent-strong is 8.1:1 on white,
// oceanic-400 6.1:1 on #131c2e.
describe("project card category", () => {
  it("uses a colour that passes AA contrast in each theme", () => {
    render(<ProjectCardContent project={project} />);
    const category = screen.getByText("Full Stack");
    expect(category).toHaveClass("text-brand-accent-strong", "dark:text-oceanic-400");
    expect(category).not.toHaveClass("text-oceanic-500");
  });
});
