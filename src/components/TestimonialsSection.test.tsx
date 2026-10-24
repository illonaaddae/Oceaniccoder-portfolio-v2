import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Testimonial } from "../types";
import TestimonialsSection from "./TestimonialsSection";

const mode = vi.hoisted(() => ({ testimonials: [] as Testimonial[] }));

vi.mock("@/services/api", () => ({
  createTestimonial: vi.fn(),
}));

vi.mock("@/hooks/useTurnstile", () => ({
  useTurnstile: () => ({ ref: vi.fn(), token: null, error: null, reset: vi.fn() }),
}));

vi.mock("./Testimonials/useTestimonialsCarousel", () => ({
  useTestimonialsCarousel: () => ({
    testimonials: mode.testimonials,
    loading: false,
    currentIndex: 0,
    isAnimating: false,
    goToNext: vi.fn(),
    goToPrev: vi.fn(),
    goToSlide: vi.fn(),
  }),
}));

const TESTIMONIAL: Testimonial = {
  $id: "t1",
  name: "Ama Mensah",
  role: "Founder",
  content: "Great work.",
  rating: 5,
};

const shareButton = () => screen.queryByRole("button", { name: /share your experience/i });

describe("TestimonialsSection", () => {
  beforeEach(() => {
    mode.testimonials = [];
  });

  test("shows the testimonials with a share button that opens the form", () => {
    mode.testimonials = [TESTIMONIAL];
    render(<TestimonialsSection />);

    expect(screen.getByText("Great work.", { exact: false })).toBeInTheDocument();
    fireEvent.click(shareButton() as HTMLElement);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("invites the first testimonial when there are none", () => {
    render(<TestimonialsSection />);

    expect(screen.getByText(/be the first to share/i)).toBeInTheDocument();
    expect(shareButton()).toBeInTheDocument();
  });
});
