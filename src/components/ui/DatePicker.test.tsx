import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { DatePicker } from "./DatePicker";

const openPanel = () => {
  fireEvent.click(screen.getByLabelText("Preferred date"));
  return screen.getByRole("dialog", { name: "Preferred date" });
};

const dayButtons = (panel: HTMLElement) =>
  within(panel)
    .getAllByRole("button")
    .filter((b) => /^\d+$/.test(b.textContent ?? ""));

describe("DatePicker", () => {
  test("opens a calendar panel and emits an ISO date on select", () => {
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} theme="dark" ariaLabel="Preferred date" />);

    const panel = openPanel();
    const day15 = dayButtons(panel).find((b) => b.textContent === "15")!;
    fireEvent.click(day15);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-15$/);
  });

  test("disables days before min so past dates cannot be booked", () => {
    const onChange = vi.fn();
    const today = new Date();
    const min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-15`;

    render(
      <DatePicker value="" onChange={onChange} theme="dark" ariaLabel="Preferred date" min={min} />,
    );

    const panel = openPanel();
    const days = dayButtons(panel);
    const day10 = days.find((b) => b.textContent === "10")!;
    const day20 = days.find((b) => b.textContent === "20")!;

    expect(day10).toBeDisabled();
    expect(day20).not.toBeDisabled();

    fireEvent.click(day10);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("disables days after max", () => {
    const onChange = vi.fn();
    const today = new Date();
    const max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-10`;

    render(
      <DatePicker value="" onChange={onChange} theme="dark" ariaLabel="Preferred date" max={max} />,
    );

    const panel = openPanel();
    const days = dayButtons(panel);
    expect(days.find((b) => b.textContent === "20")!).toBeDisabled();
    expect(days.find((b) => b.textContent === "5")!).not.toBeDisabled();
  });

  test("shows the selected date on the trigger", () => {
    render(
      <DatePicker value="2026-06-15" onChange={vi.fn()} theme="light" ariaLabel="Preferred date" />,
    );
    expect(screen.getByLabelText("Preferred date")).toHaveTextContent("Jun 15, 2026");
  });

  test("is named by a visible label plus the shown date when given labelId", () => {
    render(
      <>
        <span id="date-label">Date</span>
        <DatePicker value="2026-10-14" onChange={vi.fn()} theme="light" labelId="date-label" />
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Date Oct 14, 2026" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Date" })).toBeInTheDocument();
  });

  test("uses the compact padding for size sm and the default otherwise", () => {
    const { rerender } = render(
      <DatePicker value="" onChange={vi.fn()} theme="light" ariaLabel="Preferred date" size="sm" />,
    );
    expect(screen.getByLabelText("Preferred date").className).toContain("py-2 ");
    rerender(<DatePicker value="" onChange={vi.fn()} theme="light" ariaLabel="Preferred date" />);
    expect(screen.getByLabelText("Preferred date").className).toContain("py-2.5");
  });
});
