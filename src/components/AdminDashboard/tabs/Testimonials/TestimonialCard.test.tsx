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

const renderCard = (testimonial: Testimonial, props: { isReadOnly?: boolean } = {}) => {
  const onApprove = vi.fn();
  render(
    <TestimonialCard
      testimonial={testimonial}
      theme="dark"
      isReadOnly={props.isReadOnly ?? false}
      onDelete={vi.fn()}
      onApprove={onApprove}
    />,
  );
  return onApprove;
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
});
