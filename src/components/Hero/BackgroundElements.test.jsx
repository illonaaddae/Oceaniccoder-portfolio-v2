import React from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BackgroundElements from "./BackgroundElements";

/**
 * The hero surface is two static layers. Its whole reason for existing in this
 * form is that it costs one paint, so these guard the budget as much as the
 * markup.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("hero BackgroundElements", () => {
  it("renders the wash and the wordmark", () => {
    const { container } = render(<BackgroundElements />);

    expect(container.querySelector(".hero-surface__wash")).toBeInTheDocument();
    expect(container.querySelector(".hero-surface__wordmark")).toHaveTextContent("oceaniccoder");
  });

  it("is decorative and cannot swallow taps", () => {
    const { container } = render(<BackgroundElements />);

    expect(container.querySelector(".hero-surface")).toHaveAttribute("aria-hidden", "true");
  });

  it("costs nothing per frame: no canvas and no animation loop", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");

    const { container } = render(<BackgroundElements />);

    // The old surface ran a rAF loop that wrote layout-triggering left/top and
    // re-blurred a full-viewport gradient every frame. Nothing here may
    // schedule a frame or open a 2D context.
    expect(container.querySelector("canvas")).toBeNull();
    expect(raf).not.toHaveBeenCalled();
  });
});
