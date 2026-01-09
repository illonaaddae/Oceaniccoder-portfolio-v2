import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import Confetti from "./Confetti";

describe("Confetti", () => {
  test("renders confetti container", () => {
    const { container } = render(<Confetti />);

    // Should have a fixed position container
    const confettiContainer = container.firstChild;
    expect(confettiContainer).toHaveClass(
      "fixed",
      "inset-0",
      "pointer-events-none"
    );
  });

  test("generates confetti pieces", () => {
    const { container } = render(<Confetti />);

    // Should have multiple confetti pieces - component uses "confetti-piece" class
    const pieces = container.querySelectorAll(".confetti-piece");
    // Mobile detection in JSDOM may vary, so check for reasonable number
    expect(pieces.length).toBeGreaterThanOrEqual(40);
  });

  test("confetti pieces have varied colors", () => {
    const { container } = render(<Confetti />);

    const pieces = container.querySelectorAll(".confetti-piece");
    const colors = new Set<string>();

    pieces.forEach((piece) => {
      const style = (piece as HTMLElement).style;
      if (style.backgroundColor) {
        colors.add(style.backgroundColor);
      }
    });

    // Should have at least 3 different colors
    expect(colors.size).toBeGreaterThanOrEqual(3);
  });

  test("confetti pieces are positioned randomly", () => {
    const { container } = render(<Confetti />);

    const pieces = container.querySelectorAll(".confetti-piece");
    const leftPositions = new Set<string>();

    pieces.forEach((piece) => {
      const style = (piece as HTMLElement).style;
      if (style.left) {
        leftPositions.add(style.left);
      }
    });

    // Should have varied positions (not all the same)
    expect(leftPositions.size).toBeGreaterThan(10);
  });

  test("includes animation styles", () => {
    const { container } = render(<Confetti />);

    // Should have a style tag with animation keyframes
    const styleTag = container.querySelector("style");
    expect(styleTag).toBeInTheDocument();
    expect(styleTag?.textContent).toContain("confetti-fall");
  });

  test("confetti container does not capture pointer events", () => {
    const { container } = render(<Confetti />);

    const confettiContainer = container.firstChild;
    expect(confettiContainer).toHaveClass("pointer-events-none");
  });
});
