import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({
          children,
          ...props
        }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
          React.createElement(tag === "aside" ? "aside" : "div", props, children),
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("react-icons/fa", () => {
  const icon = (name: string) => () => <span>{name}</span>;
  return {
    FaCalendarAlt: icon("cal"),
    FaClock: icon("clk"),
    FaVideo: icon("vid"),
    FaComments: icon("cmt"),
    FaRocket: icon("rkt"),
    FaHeart: icon("hrt"),
    FaCheckCircle: icon("chk"),
    FaArrowRight: icon("arr"),
    FaUser: icon("usr"),
    FaEnvelope: icon("env"),
    FaPhone: icon("phn"),
    FaGlobe: icon("glb"),
    FaExternalLinkAlt: icon("ext"),
    // Used by the design-system DatePicker the date field now renders.
    FaRegCalendarAlt: icon("cal"),
    FaChevronLeft: icon("prev"),
    FaChevronRight: icon("next"),
  };
});

vi.mock("../services/api/bookings", () => ({
  createBooking: vi.fn(),
  getBookedTimesForDate: vi.fn(),
}));

vi.mock("../utils/apiUrl", () => ({
  apiUrl: (path: string) => path,
}));

// Stands in for Cloudflare. Most tests start with the token already there; a
// test that sets `initialToken` to null delivers it when it chooses, the way
// Cloudflare does a few seconds after the widget mounts.
const turnstileMock = vi.hoisted(() => ({
  initialToken: "token-0" as string | null,
  deliverToken: null as ((token: string) => void) | null,
}));
vi.mock("@/hooks/useTurnstile", async () => {
  const { useState } = await import("react");
  return {
    useTurnstile: () => {
      const [token, setToken] = useState<string | null>(turnstileMock.initialToken);
      turnstileMock.deliverToken = setToken;
      return {
        ref: () => {},
        token,
        error: null,
        // Tokens are single-use: the real hook clears it on reset.
        reset: () => setToken(null),
      };
    },
  };
});

import BookingSection from "./BookingSection";
import { createBooking, getBookedTimesForDate } from "../services/api/bookings";

const mockCreateBooking = createBooking as ReturnType<typeof vi.fn>;
const mockGetBookedTimes = getBookedTimesForDate as ReturnType<typeof vi.fn>;

beforeEach(() => {
  // clearAllMocks preserves implementations; restoreAllMocks would reset vi.fn() to undefined.
  vi.clearAllMocks();
  turnstileMock.initialToken = "token-0";
  mockCreateBooking.mockResolvedValue({ $id: "abcdef12345678" });
  mockGetBookedTimes.mockResolvedValue(new Set());
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, meetLink: null, calendarEventLink: null }),
  });
});

// ── Navigation helpers ────────────────────────────────────────────────────────

// getByRole works out the accessible name of every element on each call, which
// on this form cost 0.4–1.3s per query in jsdom. Under the full parallel suite
// that pushed these tests past their timeout. Matching buttons by aria-label or
// text is enough here and takes a few milliseconds.
const buttons = (name: RegExp) =>
  Array.from(document.querySelectorAll("button")).filter((b) =>
    name.test(b.getAttribute("aria-label") ?? b.textContent ?? ""),
  );
const button = (name: RegExp) => {
  const found = buttons(name);
  if (found.length !== 1) {
    throw new Error(`Expected one button matching ${name}, found ${found.length}`);
  }
  return found[0];
};

// fireEvent.change is more reliable than userEvent.type with React 19 +
// @testing-library/user-event@13 (older API, not designed for React 19).
const fillStep1 = () => {
  fireEvent.change(screen.getByPlaceholderText("Jane Smith"), {
    target: { value: "Ada Lovelace" },
  });
  fireEvent.change(screen.getByPlaceholderText("jane@example.com"), {
    target: { value: "ada@example.com" },
  });
};

const advanceToStep2 = async () => {
  fillStep1();
  fireEvent.click(button(/continue/i));
  await waitFor(() => screen.getByLabelText(/preferred date/i));
};

/**
 * Opens the design-system date picker and takes the last selectable day of
 * the month on view. Which day it lands on does not matter to any assertion —
 * the flow just needs a date set so step 2 can be completed.
 */
/**
 * Opens the design-system date picker and takes the last selectable day of
 * the month on view. Which day it lands on does not matter to any assertion —
 * the flow just needs a date set so step 2 can be completed.
 *
 * Deliberately not wrapped in `act`: the panel is queried between two events,
 * and inside an `act` callback React has not yet flushed the open state to
 * the DOM, so the dialog would not be found.
 */
const pickDate = async () => {
  fireEvent.click(screen.getByLabelText(/preferred date/i));
  const dialog = await screen.findByRole("dialog", { name: /preferred date/i });
  const days = Array.from(dialog.querySelectorAll("button")).filter(
    (b) => /^\d+$/.test(b.textContent ?? "") && !b.hasAttribute("disabled"),
  );
  fireEvent.click(days[days.length - 1]);
};

const advanceToStep3 = async () => {
  fireEvent.click(buttons(/discovery call/i)[0]);
  await pickDate();
  await waitFor(() => button(/09:00 AM/i));
  fireEvent.click(button(/09:00 AM/i));
  fireEvent.click(button(/continue/i));
  await waitFor(() => button(/confirm booking/i));
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("BookingSection — submit flow", () => {
  test("shows success screen after successful booking (no meet link)", async () => {
    render(<BookingSection />);
    await advanceToStep2();
    await advanceToStep3();

    fireEvent.click(button(/confirm booking/i));

    await waitFor(() => {
      expect(screen.getByText("Booking Received!")).toBeInTheDocument();
    });
    expect(mockCreateBooking).toHaveBeenCalledOnce();
    expect(screen.queryByRole("link", { name: /join google meet/i })).not.toBeInTheDocument();
  });

  test("shows Google Meet and calendar buttons when Azure Function returns links", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        meetLink: "https://meet.google.com/abc-defg-hij",
        calendarEventLink: "https://calendar.google.com/event?eid=abc",
      }),
    });

    render(<BookingSection />);
    await advanceToStep2();
    await advanceToStep3();

    fireEvent.click(button(/confirm booking/i));

    await waitFor(() => {
      expect(screen.getByText("You're Booked!")).toBeInTheDocument();
    });
    const meetBtn = screen.getByRole("link", { name: /join google meet/i });
    expect(meetBtn).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
    const calBtn = screen.getByRole("link", { name: /view calendar event/i });
    expect(calBtn).toHaveAttribute("href", "https://calendar.google.com/event?eid=abc");
  });

  test("shows error and blocks booking when slot is already taken (409)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: "slot_taken",
        message: "09:00 AM on 2099-06-15 is already booked. Please choose a different time.",
      }),
    });

    render(<BookingSection />);
    await advanceToStep2();
    await advanceToStep3();

    fireEvent.click(button(/confirm booking/i));

    await waitFor(() => {
      expect(screen.getByText(/09:00 AM on 2099-06-15 is already booked/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Booking Received!")).not.toBeInTheDocument();
    // createBooking must NOT be called — the 409 blocks execution before the save
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("409 shows 'choose a different time' back-link that returns to step 2", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: "slot_taken",
        message: "That time slot is already booked. Please choose a different time.",
      }),
    });

    render(<BookingSection />);
    await advanceToStep2();
    await advanceToStep3();

    fireEvent.click(button(/confirm booking/i));

    await waitFor(() => {
      expect(button(/choose a different time/i)).toBeInTheDocument();
    });
    fireEvent.click(button(/choose a different time/i));
    expect(screen.getByLabelText(/preferred date/i)).toBeInTheDocument();
  });

  test("shows generic error when the calendar and the save both fail", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    mockCreateBooking.mockRejectedValue(new Error("Save failed"));

    render(<BookingSection />);
    await advanceToStep2();
    await advanceToStep3();

    fireEvent.click(button(/confirm booking/i));

    await waitFor(() => {
      expect(screen.getByText(/booking failed/i)).toBeInTheDocument();
    });
  });

  test("waits for the spam-check token before Confirm can create the calendar event", async () => {
    turnstileMock.initialToken = null;
    render(<BookingSection />);
    await advanceToStep2();
    await advanceToStep3();

    // No token yet: a click here used to create the calendar event, then fail
    // to save because /api/submit needs the token.
    expect(button(/confirm booking/i)).toBeDisabled();
    expect(button(/confirm booking/i)).toHaveAccessibleDescription(/running a quick spam check/i);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/running a quick spam check/i),
    );
    fireEvent.click(button(/confirm booking/i));
    expect(global.fetch).not.toHaveBeenCalledWith("/api/create-booking", expect.anything());

    act(() => turnstileMock.deliverToken?.("token-1"));
    await waitFor(() => expect(button(/confirm booking/i)).not.toBeDisabled());
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/you can confirm your booking/i),
    );
    fireEvent.click(button(/confirm booking/i));

    await waitFor(() => expect(screen.getByText("Booking Received!")).toBeInTheDocument());
    expect(mockCreateBooking).toHaveBeenCalledWith(expect.anything(), "token-1");
  });

  test("says what to do when the spam-check token is slow to arrive", async () => {
    turnstileMock.initialToken = null;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<BookingSection />);
      await advanceToStep2();
      await advanceToStep3();
      expect(screen.getByRole("status")).not.toHaveTextContent(/taking longer/i);

      act(() => vi.advanceTimersByTime(20000));

      expect(screen.getByRole("status")).toHaveTextContent(/taking longer than usual/i);
      expect(button(/confirm booking/i)).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  test("continue button starts disabled and enables once name and email are filled", async () => {
    render(<BookingSection />);
    expect(button(/continue/i)).toBeDisabled();

    // Wrap in act so React flushes state updates before waitFor polls
    await act(async () => {
      fillStep1();
    });
    // Re-query inside waitFor — avoids stale reference after React re-render
    await waitFor(() => expect(button(/continue/i)).not.toBeDisabled());
  });
});
