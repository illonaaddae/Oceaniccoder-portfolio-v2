import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Testimonial } from "../types";
import TestimonialsSection from "./TestimonialsSection";

const mode = vi.hoisted(() => ({ usesCosmos: false, testimonials: [] as Testimonial[] }));

vi.mock("@/services/api/dataApi", () => ({
  get usesCosmos() {
    return mode.usesCosmos;
  },
}));

vi.mock("@/services/api", () => ({
  createTestimonial: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock("@/hooks/useTurnstile", () => ({
  useTurnstile: () => ({ active: false, ref: vi.fn(), token: null, error: null, reset: vi.fn() }),
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
    mode.usesCosmos = false;
    mode.testimonials = [];
  });

  test("hides the share button in Appwrite mode but still shows testimonials", () => {
    mode.testimonials = [TESTIMONIAL];
    render(<TestimonialsSection />);

    expect(screen.getByText("Great work.", { exact: false })).toBeInTheDocument();
    expect(shareButton()).not.toBeInTheDocument();
  });

  test("renders nothing in Appwrite mode when there are no testimonials", () => {
    const { container } = render(<TestimonialsSection />);

    expect(container).toBeEmptyDOMElement();
  });

  test("shows the share button and opens the form in Cosmos mode", () => {
    mode.usesCosmos = true;
    mode.testimonials = [TESTIMONIAL];
    render(<TestimonialsSection />);

    fireEvent.click(shareButton() as HTMLElement);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("invites the first testimonial in Cosmos mode when there are none", () => {
    mode.usesCosmos = true;
    render(<TestimonialsSection />);

    expect(screen.getByText(/be the first to share/i)).toBeInTheDocument();
    expect(shareButton()).toBeInTheDocument();
  });
});
