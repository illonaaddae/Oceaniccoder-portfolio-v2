import { beforeAll, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProjectCardImage from "./ProjectCardImage";

const project = {
  title: "Demo project",
  image: "/images/x.webp",
  status: "Completed",
  featured: true,
  demoVideoUrl: "https://example.com/demo.mp4",
  technologies: [],
};

// White 12px text needs 4.5:1. oceanic-500 gave 4.35:1 and oceanic-400 2.78:1;
// oceanic-600 and darker pass (5.9:1 and up), including on hover.
const LIGHT_OCEANIC = /(^|:)(from|to)-oceanic-(400|500)$/;

describe("project card image badges", () => {
  // LazyImage waits for an IntersectionObserver, which jsdom lacks.
  beforeAll(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it.each([
    ["Featured", () => screen.getByText("Featured")],
    ["Demo", () => screen.getByRole("button", { name: /watch the demo project demo video/i })],
  ])("%s badge keeps white text on oceanic-600 or darker, at rest and on hover", (_, get) => {
    render(
      <MemoryRouter>
        <ProjectCardImage project={project} />
      </MemoryRouter>,
    );
    const classes = get().className.split(/\s+/);
    expect(classes).toContain("text-white");
    expect(classes.filter((c) => LIGHT_OCEANIC.test(c))).toEqual([]);
  });
});
