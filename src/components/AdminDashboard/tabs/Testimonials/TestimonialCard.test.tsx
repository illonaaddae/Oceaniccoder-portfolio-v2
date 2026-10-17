import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import type { Testimonial } from "@/types";
import { TestimonialCard } from "./TestimonialCard";

const TESTIMONIAL: Testimonial = {
  $id: "t1",
  name: "Ama Mensah",
  role: "Founder",
  content: "Great work.",
  rating: 5,
};

const renderCard = (
  testimonial: Testimonial,
  props: { isReadOnly?: boolean; theme?: "light" | "dark" } = {},
) => {
  const onApprove = vi.fn();
  const card = (t: Testimonial) => (
    <TestimonialCard
      testimonial={t}
      theme={props.theme ?? "dark"}
      isReadOnly={props.isReadOnly ?? false}
      onDelete={vi.fn()}
      onApprove={onApprove}
    />
  );
  const { rerender } = render(card(testimonial));
  return Object.assign(onApprove, { rerender: (t: Testimonial) => rerender(card(t)) });
};

const approveButton = () => screen.queryByRole("button", { name: /approve/i });

describe("TestimonialCard", () => {
  test("approves a visitor submission waiting for approval", () => {
    const onApprove = renderCard({ ...TESTIMONIAL, approved: false });

    expect(screen.getByText("Pending approval")).toBeInTheDocument();
    fireEvent.click(approveButton()!);
    expect(onApprove).toHaveBeenCalledWith("t1");
  });

  test.each([
    ["approved", true],
    ["missing the flag", undefined],
  ])("treats a testimonial %s as published", (_label, approved) => {
    renderCard({ ...TESTIMONIAL, approved });

    expect(screen.queryByText("Pending approval")).not.toBeInTheDocument();
    expect(approveButton()).not.toBeInTheDocument();
  });

  test("shows no Approve button on the read-only dashboard", () => {
    renderCard({ ...TESTIMONIAL, approved: false }, { isReadOnly: true });

    expect(screen.getByText("Pending approval")).toBeInTheDocument();
    expect(approveButton()).not.toBeInTheDocument();
  });

  test("separates the name and badges in the heading's accessible name", () => {
    renderCard({ ...TESTIMONIAL, approved: false, featured: true });

    expect(
      screen.getByRole("heading", { name: "Ama Mensah Pending approval Featured" }),
    ).toBeInTheDocument();
  });

  test.each([
    ["light", ["bg-warning-100", "text-warning-700"], ["bg-success-100", "text-success-700"]],
    [
      "dark",
      ["bg-warning-400/10", "text-warning-400", "border-warning-400/30"],
      ["bg-success-400/10", "text-success-400", "border-success-400/30"],
    ],
  ] as const)(
    "uses the AA semantic tokens for the badge and Approve button (%s)",
    (theme, badge, approve) => {
      renderCard({ ...TESTIMONIAL, approved: false }, { theme });

      expect(screen.getByText("Pending approval")).toHaveClass(...badge);
      expect(approveButton()).toHaveClass(...approve);
    },
  );
});
