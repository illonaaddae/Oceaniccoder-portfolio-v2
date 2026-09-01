import React from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BackgroundElements from "./BackgroundElements";

/**
 * The surface paints to a canvas, so there is nothing in the DOM to assert
 * against. These tests stand in a recording 2D context and drive a few
 * animation frames by hand, which is the only way to catch the field or the
 * labels silently not drawing.
 */
function stubCanvas() {
  const calls = { fillRect: 0, fillText: [], arc: 0 };
  const ctx = {
    canvas: { width: 0, height: 0 },
    fillStyle: "",
    font: "",
    textBaseline: "",
    globalAlpha: 1,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(() => {
      calls.fillRect += 1;
    }),
    fillText: vi.fn((text, x, y) => {
      calls.fillText.push({ text, x, y });
    }),
    beginPath: vi.fn(),
    arc: vi.fn(() => {
      calls.arc += 1;
    }),
    fill: vi.fn(),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
  };
  vi.spyOn(window.HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
  return calls;
}

/** jsdom reports 0×0 for everything; give the hero a desktop-sized box. */
function stubLayout() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect() {
    if (this.classList.contains("hero-surface")) {
      return { left: 0, top: 0, width: 1440, height: 900, right: 1440, bottom: 900 };
    }
    // Stand-in for the headline + portrait columns.
    return { left: 240, top: 300, width: 960, height: 380, right: 1200, bottom: 680 };
  });
}

function stubObservers() {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  window.ResizeObserver = global.ResizeObserver;
  global.IntersectionObserver = class {
    constructor(cb) {
      cb([{ isIntersecting: true }]);
    }
    observe() {}
    disconnect() {}
  };
  window.IntersectionObserver = global.IntersectionObserver;
}

/** Runs `count` frames, `stepMs` apart, through the rAF queue. */
function runFrames(count, stepMs = 16.7) {
  let now = 0;
  const queue = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    queue.push(cb);
    return queue.length;
  });
  window.cancelAnimationFrame = vi.fn();
  return {
    pump() {
      for (let i = 0; i < count; i++) {
        const pending = queue.splice(0, queue.length);
        if (!pending.length) break;
        now += stepMs;
        pending.forEach((cb) => cb(now));
      }
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("hero BackgroundElements", () => {
  it("paints the dot field", () => {
    const calls = stubCanvas();
    stubLayout();
    stubObservers();
    const driver = runFrames(30);

    render(
      <section id="home">
        <BackgroundElements />
        <div className="container">
          <div>content</div>
        </div>
      </section>,
    );
    driver.pump();

    expect(calls.fillRect).toBeGreaterThan(1000);
  });

  it("spawns drifting stack labels clear of the hero content", () => {
    const calls = stubCanvas();
    stubLayout();
    stubObservers();
    const driver = runFrames(240);

    render(
      <section id="home">
        <BackgroundElements />
        <div className="container">
          <div>content</div>
        </div>
      </section>,
    );
    driver.pump();

    expect(calls.fillText.length).toBeGreaterThan(0);
    // Nothing should land inside the content box (240–1200 × 300–680).
    const overlapping = calls.fillText.filter(
      (c) => c.x > 216 && c.x < 1224 && c.y > 276 && c.y < 704,
    );
    expect(overlapping).toHaveLength(0);
  });
});
