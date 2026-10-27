import React from "react";
import { render, screen, within, cleanup, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AIJourneySection, { JOURNEY_STEPS } from "./AIJourneySection";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AIJourneySection", () => {
  it("names the section with its heading", () => {
    render(<AIJourneySection />);

    expect(screen.getByRole("region", { name: /AI & Machine Learning/ })).toBeInTheDocument();
  });

  it("lists the learning path in order, with Data Science before Machine Learning", () => {
    render(<AIJourneySection />);

    const path = screen.getByRole("list", { name: "My learning path" });
    const steps = within(path)
      .getAllByRole("listitem")
      .map((li) => li.textContent?.replace("→", "").trim());

    expect(steps).toEqual([...JOURNEY_STEPS]);
    expect(steps.indexOf("Data Science")).toBe(steps.indexOf("Machine Learning") - 1);
    expect(steps[steps.length - 1]).toBe("Robotics");
  });

  it("hides the decorative drawing and the arrows from assistive technology", () => {
    const { container } = render(<AIJourneySection />);

    expect(container.querySelector("svg.aij-scene")).toHaveAttribute("aria-hidden", "true");
    container
      .querySelectorAll(".ai-journey__arrow")
      .forEach((arrow) => expect(arrow).toHaveAttribute("aria-hidden", "true"));
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

    const { container, unmount } = render(<AIJourneySection />);
    const section = container.querySelector("#ai-journey");
    expect(section).not.toHaveClass("is-on-screen");

    act(() => report([{ isIntersecting: true }]));
    expect(section).toHaveClass("is-on-screen");

    act(() => report([{ isIntersecting: false }]));
    expect(section).not.toHaveClass("is-on-screen");

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
