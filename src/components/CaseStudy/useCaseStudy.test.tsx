import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// Mirrors the static fallback before it was cached: fresh array and objects
// on every call, which used to drive the hook into an infinite update loop.
vi.mock("../../hooks/usePortfolioData", () => ({
  usePortfolioData: () => ({
    projects: [
      { $id: "a", title: "Alpha Site", category: "web" },
      { $id: "b", title: "Beta App", category: "web" },
    ],
    loading: false,
  }),
}));

const { useCaseStudy } = await import("./useCaseStudy");

function Probe() {
  const { project, prevProject, relatedProjects } = useCaseStudy();
  return (
    <div data-testid="probe">
      {project?.title ?? "none"}|{prevProject?.title ?? "-"}|{relatedProjects.length}
    </div>
  );
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:slug" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

describe("useCaseStudy", () => {
  it("finds the project by title slug without looping on unstable project lists", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    renderAt("/projects/beta-app");

    expect(screen.getByTestId("probe").textContent).toBe("Beta App|Alpha Site|1");
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("returns no project for an unknown slug", () => {
    renderAt("/projects/missing");
    expect(screen.getByTestId("probe").textContent).toBe("none|-|0");
  });
});
