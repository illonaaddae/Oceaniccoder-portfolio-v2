import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import SupportButton from "./SupportButton";

// Mock the imageUrls
vi.mock("../utils/imageUrls", () => ({
  IMAGES: {
    scrimba: "https://example.com/scrimba-logo.png",
  },
}));

describe("SupportButton", () => {
  test("renders floating button", () => {
    render(<SupportButton />);

    const toggleButton = screen.getByRole("button", { name: /support/i });
    expect(toggleButton).toBeInTheDocument();
  });

  test("expands to show support links when clicked", () => {
    render(<SupportButton />);

    // Click toggle button to expand
    const toggleButton = screen.getByRole("button", { name: /support/i });
    fireEvent.click(toggleButton);

    // Now links should be visible
    expect(screen.getByText(/Buy Me a Coffee/i)).toBeInTheDocument();
    expect(screen.getByText(/Scrimba Pro/i)).toBeInTheDocument();
  });

  test("shows Buy Me a Coffee link with correct URL", () => {
    render(<SupportButton />);

    // Expand the menu
    const toggleButton = screen.getByRole("button", { name: /support/i });
    fireEvent.click(toggleButton);

    const coffeeLink = screen.getByRole("link", { name: /Buy Me a Coffee/i });
    expect(coffeeLink).toHaveAttribute(
      "href",
      "https://buymeacoffee.com/gliy8vpa7m"
    );
    expect(coffeeLink).toHaveAttribute("target", "_blank");
  });

  test("shows Scrimba link with correct ambassador URL", () => {
    render(<SupportButton />);

    // Expand the menu
    const toggleButton = screen.getByRole("button", { name: /support/i });
    fireEvent.click(toggleButton);

    const scrimbaLink = screen.getByRole("link", { name: /Scrimba Pro/i });
    expect(scrimbaLink).toHaveAttribute(
      "href",
      "https://scrimba.com/?via=u01ap3s"
    );
    expect(scrimbaLink).toHaveAttribute("target", "_blank");
  });

  test("shows 20% OFF badge for Scrimba", () => {
    render(<SupportButton />);

    // Expand the menu
    const toggleButton = screen.getByRole("button", { name: /support/i });
    fireEvent.click(toggleButton);

    expect(screen.getByText("20% OFF")).toBeInTheDocument();
  });

  test("toggles expanded state when clicked multiple times", () => {
    render(<SupportButton />);

    const toggleButton = screen.getByRole("button", { name: /support/i });

    // Initially collapsed - check for heart icon
    expect(toggleButton).toBeInTheDocument();

    // Expand
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Buy Me a Coffee/i)).toBeInTheDocument();

    // Collapse - button still exists
    fireEvent.click(toggleButton);
    expect(toggleButton).toBeInTheDocument();
  });

  test("button is positioned at bottom-left", () => {
    const { container } = render(<SupportButton />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("fixed", "bottom-6", "left-6");
  });
});
