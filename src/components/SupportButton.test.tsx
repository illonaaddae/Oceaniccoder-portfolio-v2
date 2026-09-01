import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi } from "vitest";
import SupportButton from "./SupportButton";

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

// Mock the imageUrls
vi.mock("../utils/imageUrls", () => ({
  IMAGES: {
    scrimba: "https://example.com/scrimba-logo.png",
  },
}));

describe("SupportButton", () => {
  test("renders floating button", () => {
    renderWithRouter(<SupportButton />);

    const toggleButton = screen.getByRole("button", { name: /support/i });
    expect(toggleButton).toBeInTheDocument();
  });

  test("expands to show support links when clicked", () => {
    renderWithRouter(<SupportButton />);

    // Click toggle button to expand
    const toggleButton = screen.getByRole("button", { name: /support/i });
    fireEvent.click(toggleButton);

    // Now links should be visible
    expect(screen.getByText(/Buy Me a Coffee/i)).toBeInTheDocument();
    expect(screen.getByText(/Scrimba Pro/i)).toBeInTheDocument();
  });

  test("shows Buy Me a Coffee link with correct URL", () => {
    renderWithRouter(<SupportButton />);

    // Expand the menu
    const toggleButton = screen.getByRole("button", { name: /support/i });
    fireEvent.click(toggleButton);

    const coffeeLink = screen.getByRole("link", { name: /Buy Me a Coffee/i });
    expect(coffeeLink).toHaveAttribute("href", "https://buymeacoffee.com/gliy8vpa7m");
    expect(coffeeLink).toHaveAttribute("target", "_blank");
  });

  test("shows Scrimba link with correct ambassador URL", () => {
    renderWithRouter(<SupportButton />);

    // Expand the menu
    const toggleButton = screen.getByRole("button", { name: /support/i });
    fireEvent.click(toggleButton);

    const scrimbaLink = screen.getByRole("link", { name: /Scrimba Pro/i });
    expect(scrimbaLink).toHaveAttribute("href", "https://scrimba.com/?via=u01ap3s");
    expect(scrimbaLink).toHaveAttribute("target", "_blank");
  });

  test("shows 20% OFF badge for Scrimba", () => {
    renderWithRouter(<SupportButton />);

    // Expand the menu
    const toggleButton = screen.getByRole("button", { name: /support/i });
    fireEvent.click(toggleButton);

    expect(screen.getByText("20% OFF")).toBeInTheDocument();
  });

  test("toggles expanded state when clicked multiple times", () => {
    renderWithRouter(<SupportButton />);

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

  test("button is positioned at bottom-left, clear of the home-indicator inset", () => {
    const { container } = renderWithRouter(<SupportButton />);

    const wrapper = container.firstChild;
    // bottom-safe, not bottom-6: a plain 24px offset put part of the tap target
    // inside the iPhone home-indicator inset (34px), where the system takes the
    // touch instead of the button.
    expect(wrapper).toHaveClass("fixed", "bottom-safe", "left-6");
  });
});

describe("SupportButton hit area", () => {
  // The wrapper is a bottom-anchored flex column that always lays out the
  // (invisible) link stack, so its box is ~260x270px. Without pointer-events
  // none on the wrapper, that transparent box sits at z-50 over the bottom-left
  // of every page and swallows taps meant for the content underneath — on a
  // phone you had to scroll a control out of that zone before it would respond.
  test("collapsed wrapper does not intercept taps over page content", () => {
    const { container } = renderWithRouter(<SupportButton />);

    expect(container.firstChild).toHaveClass("pointer-events-none");
  });

  test("toggle button stays tappable inside the pass-through wrapper", () => {
    renderWithRouter(<SupportButton />);

    const toggleButton = screen.getByRole("button", { name: /support/i });
    expect(toggleButton).toHaveClass("pointer-events-auto");
  });
});
