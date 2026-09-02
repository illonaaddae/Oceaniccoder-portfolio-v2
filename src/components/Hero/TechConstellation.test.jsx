import React from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TechConstellation from "./TechConstellation";
import { TECH_CONSTELLATION } from "./heroTech";

/**
 * The constellation replaced a static wordmark that was competing with the
 * hero copy. It is allowed to animate, but only on composited properties and
 * only from CSS — the hero's cost is still one paint plus GPU compositing,
 * never a JS frame loop. These tests guard that budget as much as the markup.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const items = (container) => Array.from(container.querySelectorAll(".hero-tech__item"));

describe("TechConstellation", () => {
  it("renders one glyph per configured technology", () => {
    const { container } = render(<TechConstellation />);

    expect(items(container)).toHaveLength(TECH_CONSTELLATION.length);
    expect(container.querySelectorAll(".hero-tech__item svg")).toHaveLength(
      TECH_CONSTELLATION.length,
    );
  });

  it("is decorative and cannot swallow taps", () => {
    const { container } = render(<TechConstellation />);

    expect(container.querySelector(".hero-tech")).toHaveAttribute("aria-hidden", "true");
  });

  it("costs nothing per frame: no canvas and no animation loop", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");

    const { container } = render(<TechConstellation />);

    expect(container.querySelector("canvas")).toBeNull();
    expect(raf).not.toHaveBeenCalled();
  });

  it("staggers every glyph so they never pulse in unison", () => {
    const { container } = render(<TechConstellation />);

    const delays = items(container).map((el) => el.style.animationDelay);

    expect(delays).toHaveLength(TECH_CONSTELLATION.length);
    expect(delays.every(Boolean)).toBe(true);
    expect(new Set(delays).size).toBe(delays.length);
  });

  it("starts each glyph mid-cycle so the hero never opens on an empty field", () => {
    const { container } = render(<TechConstellation />);

    // A positive delay would hold every glyph at opacity 0 for its first
    // seconds on screen, which is exactly the blank-then-pop-in we do not want.
    for (const el of items(container)) {
      expect(parseFloat(el.style.animationDelay)).toBeLessThan(0);
    }
  });

  it("gives each glyph its own duration and place on the surface", () => {
    const { container } = render(<TechConstellation />);

    items(container).forEach((el, i) => {
      const tech = TECH_CONSTELLATION[i];
      expect(el.style.animationDuration).toBe(`${tech.duration}s`);
      expect(el.style.top).toBe(`${tech.top}%`);
      expect(el.style.left).toBe(`${tech.left}%`);
    });
  });
});

describe("TECH_CONSTELLATION data", () => {
  it("names each technology once", () => {
    const names = TECH_CONSTELLATION.map((t) => t.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps every glyph inside the surface", () => {
    for (const tech of TECH_CONSTELLATION) {
      expect(tech.top).toBeGreaterThanOrEqual(4);
      expect(tech.top).toBeLessThanOrEqual(92);
      expect(tech.left).toBeGreaterThanOrEqual(2);
      expect(tech.left).toBeLessThanOrEqual(94);
    }
  });

  it("leaves the copy column clear", () => {
    // The headline, typewriter role and CTAs occupy roughly the left half
    // between 30% and 78% of the hero's height on desktop. A glyph drifting
    // behind that text is the distraction this component was built to remove.
    const overlapping = TECH_CONSTELLATION.filter((t) => t.left < 46 && t.top > 30 && t.top < 78);

    expect(overlapping).toEqual([]);
  });

  it("spreads the loop lengths so the field never settles into a rhythm", () => {
    for (const tech of TECH_CONSTELLATION) {
      expect(tech.duration).toBeGreaterThanOrEqual(9);
      expect(tech.duration).toBeLessThanOrEqual(15);
    }

    expect(new Set(TECH_CONSTELLATION.map((t) => t.duration)).size).toBeGreaterThan(3);
  });
});
