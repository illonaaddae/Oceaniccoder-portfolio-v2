import React from "react";
import { render, screen, within, cleanup, act, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AIJourneyCard from "./AIJourneyCard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AIJourneyCard", () => {
  it("names the section with its heading", () => {
    render(<AIJourneyCard />);

    expect(screen.getByRole("region", { name: "AI & Machine Learning" })).toBeInTheDocument();
  });

  it("lists the learning path in the agreed order", () => {
    render(<AIJourneyCard />);

    const path = screen.getByRole("list", { name: "My learning path" });
    const steps = within(path)
      .getAllByRole("listitem")
      .map((li) => li.textContent?.replace("→", "").trim());

    expect(steps).toEqual([
      "Python",
      "Data Engineering",
      "Data Science",
      "Machine Learning",
      "Applied AI",
      "Robotics",
    ]);
  });

  it("hides the decorative drawing and the arrows from assistive technology", () => {
    const { container } = render(<AIJourneyCard />);

    expect(container.querySelector("svg.aij-scene")).toHaveAttribute("aria-hidden", "true");
    const arrows = container.querySelectorAll(".ai-journey__arrow");
    expect(arrows).toHaveLength(5);
    arrows.forEach((arrow) => expect(arrow).toHaveAttribute("aria-hidden", "true"));
  });

  it("lets the visitor pause and resume the animation", () => {
    const { container } = render(<AIJourneyCard />);
    const section = container.querySelector("#ai-journey");
    expect(section).toHaveClass("is-animating");

    fireEvent.click(screen.getByRole("button", { name: "Pause animation" }));
    expect(section).not.toHaveClass("is-animating");
    expect(screen.getByRole("button", { name: "Play animation" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Play animation" }));
    expect(section).toHaveClass("is-animating");
    expect(screen.getByRole("button", { name: "Pause animation" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("runs the animation only while the section is on screen", () => {
    let report: (entries: Array<{ isIntersecting: boolean }>) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof report) {
          report = cb;
        }
        observe() {}
        disconnect = disconnect;
      },
    );

    const { container, unmount } = render(<AIJourneyCard />);
    const section = container.querySelector("#ai-journey");
    expect(section).not.toHaveClass("is-animating");

    act(() => report([{ isIntersecting: true }]));
    expect(section).toHaveClass("is-animating");

    act(() => report([{ isIntersecting: false }]));
    expect(section).not.toHaveClass("is-animating");

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
