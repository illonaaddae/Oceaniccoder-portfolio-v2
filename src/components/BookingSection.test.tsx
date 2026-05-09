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
  };
});

vi.mock("../services/api/bookings", () => ({
  createBooking: vi.fn(),
  getBookedTimesForDate: vi.fn(),
}));

vi.mock("../utils/apiUrl", () => ({
  apiUrl: (path: string) => path,
}));

import BookingSection from "./BookingSection";
import { createBooking, getBookedTimesForDate } from "../services/api/bookings";

const mockCreateBooking = createBooking as ReturnType<typeof vi.fn>;
const mockGetBookedTimes = getBookedTimesForDate as ReturnType<typeof vi.fn>;

beforeEach(() => {
  // clearAllMocks preserves implementations; restoreAllMocks would reset vi.fn() to undefined.
  vi.clearAllMocks();
  mockCreateBooking.mockResolvedValue({ $id: "abcdef12345678" });
  mockGetBookedTimes.mockResolvedValue(new Set());
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, meetLink: null, calendarEventLink: null }),
  });
});

// ── Navigation helpers ────────────────────────────────────────────────────────

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
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await waitFor(() => screen.getByLabelText(/preferred date/i));
};

const advanceToStep3 = async () => {
  fireEvent.click(screen.getAllByRole("button", { name: /discovery call/i })[0]);
  await act(async () => {
    fireEvent.change(screen.getByLabelText(/preferred date/i), {
      target: { value: "2099-06-15" },
    });
  });
  await waitFor(() => screen.getByRole("button", { name: /09:00 AM/i }));
  fireEvent.click(screen.getByRole("button", { name: /09:00 AM/i }));
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await waitFor(() => screen.getByRole("button", { name: /confirm booking/i }));
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("BookingSection — submit flow", () => {
  test("shows success screen after successful booking (no meet link)", async () => {
    render(<BookingSection />);
    await advanceToStep2();
    await advanceToStep3();

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/09:00 AM on 2099-06-15 is already booked/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Booking Received!")).not.toBeInTheDocument();
    // createBooking must NOT be called — the 409 blocks execution before Appwrite
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

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /choose a different time/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /choose a different time/i }));
    expect(screen.getByLabelText(/preferred date/i)).toBeInTheDocument();
  });

  test("shows generic error when API and Appwrite are both unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    mockCreateBooking.mockRejectedValue(new Error("Appwrite down"));

    render(<BookingSection />);
    await advanceToStep2();
    await advanceToStep3();

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/booking failed/i)).toBeInTheDocument();
    });
  });

  test("continue button starts disabled and enables once name and email are filled", async () => {
    render(<BookingSection />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();

    // Wrap in act so React flushes state updates before waitFor polls
    await act(async () => {
      fillStep1();
    });
    // Re-query inside waitFor — avoids stale reference after React re-render
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled(),
    );
  });
});
