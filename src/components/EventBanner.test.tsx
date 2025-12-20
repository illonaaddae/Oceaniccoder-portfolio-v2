import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the Confetti component to avoid animation issues in tests
vi.mock("./Confetti", () => ({
  default: () => <div data-testid="confetti">Confetti</div>,
}));

import EventBanner from "./EventBanner";

describe("EventBanner", () => {
  const originalDate = global.Date;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Restore the original Date
    global.Date = originalDate;
  });

  // Helper to mock the date while preserving Date.now()
  const mockDate = (month: number, day: number) => {
    const mockDateValue = new Date(2025, month - 1, day);

    // Create a mock Date constructor that returns our mocked date
    // but preserves static methods like Date.now()
    const MockDate = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockDateValue);
        } else {
          // @ts-ignore
          super(...args);
        }
      }
    } as any;

    // Preserve static methods
    MockDate.now = originalDate.now;
    MockDate.parse = originalDate.parse;
    MockDate.UTC = originalDate.UTC;

    global.Date = MockDate;
  };

  test("renders birthday banner on April 28th", () => {
    mockDate(4, 28); // April 28th

    render(<EventBanner />);

    expect(screen.getByText(/It's My Birthday!/i)).toBeInTheDocument();
    expect(
      screen.getByText(/April 28th is my special day/i)
    ).toBeInTheDocument();
  });

  test("renders New Year banner on January 1st", () => {
    mockDate(1, 1); // January 1st

    render(<EventBanner />);

    expect(screen.getByText(/Happy New Year!/i)).toBeInTheDocument();
  });

  test("renders New Year banner on January 3rd (end of range)", () => {
    mockDate(1, 3); // January 3rd

    render(<EventBanner />);

    expect(screen.getByText(/Happy New Year!/i)).toBeInTheDocument();
  });

  test("does not render banner on regular day", () => {
    mockDate(6, 15); // June 15th - no event

    const { container } = render(<EventBanner />);

    expect(container.firstChild).toBeNull();
  });

  test("dismisses banner when close button is clicked", () => {
    mockDate(4, 28); // April 28th

    render(<EventBanner />);

    // Banner should be visible
    expect(screen.getByText(/It's My Birthday!/i)).toBeInTheDocument();

    // Click dismiss button
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // Banner should be hidden
    expect(screen.queryByText(/It's My Birthday!/i)).not.toBeInTheDocument();
  });

  test("saves dismissal to localStorage", () => {
    mockDate(4, 28); // April 28th

    render(<EventBanner />);

    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // Check localStorage was updated
    const dismissedKey = "event_dismissed_birthday_4_28";
    expect(localStorage.getItem(dismissedKey)).toBe("true");
  });

  test("does not show banner if already dismissed today", () => {
    mockDate(4, 28); // April 28th

    // Pre-dismiss the banner
    localStorage.setItem("event_dismissed_birthday_4_28", "true");

    const { container } = render(<EventBanner />);

    expect(container.firstChild).toBeNull();
  });

  test("shows confetti for birthday event", () => {
    mockDate(4, 28); // April 28th

    render(<EventBanner />);

    // Confetti should be rendered (mocked)
    expect(screen.getByTestId("confetti")).toBeInTheDocument();
  });
});
