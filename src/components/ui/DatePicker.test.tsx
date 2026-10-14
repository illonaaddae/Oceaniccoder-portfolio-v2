import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

  test("moves focus into the calendar, arrows between days, and returns it on pick", async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-10-14" onChange={onChange} theme="light" ariaLabel="Date" />);
    const trigger = screen.getByRole("button", { name: "Date" });
    fireEvent.click(trigger);
    const day14 = await screen.findByRole("button", { name: "October 14, 2026" });
    await waitFor(() => expect(day14).toHaveFocus());
    expect(day14).toHaveAttribute("aria-pressed", "true");
    expect(day14).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(day14, { key: "ArrowRight" });
    const day15 = screen.getByRole("button", { name: "October 15, 2026" });
    await waitFor(() => expect(day15).toHaveFocus());

    fireEvent.keyDown(day15, { key: "PageDown" });
    const nov15 = await screen.findByRole("button", { name: "November 15, 2026" });
    await waitFor(() => expect(nov15).toHaveFocus());

    fireEvent.click(nov15);
    expect(onChange).toHaveBeenCalledWith("2026-11-15");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("returns focus to the field on Escape", async () => {
    render(<DatePicker value="2026-10-14" onChange={vi.fn()} theme="dark" ariaLabel="Date" />);
    const trigger = screen.getByRole("button", { name: "Date" });
    fireEvent.click(trigger);
    const day = await screen.findByRole("button", { name: "October 14, 2026" });
    await waitFor(() => expect(day).toHaveFocus());
    fireEvent.keyDown(day, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("keeps Tab inside the open panel", async () => {
    render(<DatePicker value="2026-10-14" onChange={vi.fn()} theme="light" ariaLabel="Date" />);
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    const clear = await screen.findByRole("button", { name: "Clear" });
    clear.focus();
    fireEvent.keyDown(clear, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Previous month" })).toHaveFocus();
  });

  test("reopens on the focused day's month after browsing and clearing", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DatePicker value="2026-10-14" onChange={onChange} theme="light" ariaLabel="Date" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    const day = await screen.findByRole("button", { name: "October 14, 2026" });
    await waitFor(() => expect(day).toHaveFocus());
    fireEvent.keyDown(day, { key: "PageDown" });
    await screen.findByRole("button", { name: "November 14, 2026" });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    rerender(<DatePicker value="" onChange={onChange} theme="light" ariaLabel="Date" />);

    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    const now = new Date();
    const todayName = `${now.toLocaleString("en-US", { month: "long" })} ${now.getDate()}, ${now.getFullYear()}`;
    const today = await screen.findByRole("button", { name: todayName });
    await waitFor(() => expect(today).toHaveFocus());
    expect(today).toHaveAttribute("tabindex", "0");
  });

  test("keeps focus on the month buttons while stepping months", async () => {
    render(<DatePicker value="2026-10-14" onChange={vi.fn()} theme="light" ariaLabel="Date" />);
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    const day = await screen.findByRole("button", { name: "October 14, 2026" });
    await waitFor(() => expect(day).toHaveFocus());
    const next = screen.getByRole("button", { name: "Next month" });
    next.focus();
    fireEvent.click(next);
    await screen.findByRole("button", { name: "November 14, 2026" });
    expect(next).toHaveFocus();
    fireEvent.click(next);
    await screen.findByRole("button", { name: "December 14, 2026" });
    expect(next).toHaveFocus();
  });

  test("leaves focus alone when the page scrolls with the panel open", async () => {
    render(<DatePicker value="2026-10-14" onChange={vi.fn()} theme="light" ariaLabel="Date" />);
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    const day = await screen.findByRole("button", { name: "October 14, 2026" });
    await waitFor(() => expect(day).toHaveFocus());
    const clear = screen.getByRole("button", { name: "Clear" });
    clear.focus();
    fireEvent.scroll(window);
    fireEvent(window, new Event("resize"));
    await new Promise((r) => setTimeout(r, 0));
    expect(clear).toHaveFocus();
  });

  test("a grid key that stays on the same day doesn't leave a focus jump for the next scroll", async () => {
    // 11 Oct 2026 is a Sunday, so Home keeps focus where it is.
    render(<DatePicker value="2026-10-11" onChange={vi.fn()} theme="light" ariaLabel="Date" />);
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    const sunday = await screen.findByRole("button", { name: "October 11, 2026" });
    await waitFor(() => expect(sunday).toHaveFocus());
    fireEvent.keyDown(sunday, { key: "Home" });
    expect(sunday).toHaveFocus();
    const clear = screen.getByRole("button", { name: "Clear" });
    clear.focus();
    fireEvent.scroll(window);
    await new Promise((r) => setTimeout(r, 0));
    expect(clear).toHaveFocus();
  });

  test("month buttons clamp into min and hand focus to a day at the boundary", async () => {
    const onChange = vi.fn();
    render(
      <DatePicker value="" onChange={onChange} theme="light" ariaLabel="Date" min="2099-10-20" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    const first = await screen.findByRole("button", { name: "October 20, 2099" });
    await waitFor(() => expect(first).toHaveFocus());
    const prev = screen.getByRole("button", { name: "Previous month" });
    expect(prev).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    await screen.findByRole("button", { name: "November 20, 2099" });
    fireEvent.keyDown(screen.getByRole("button", { name: "November 20, 2099" }), {
      key: "ArrowUp",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "November 13, 2099" }), {
      key: "ArrowUp",
    });
    // Nov 6 → Previous month would be Oct 6, before min: it clamps to Oct 20.
    prev.focus();
    fireEvent.click(prev);
    const clamped = await screen.findByRole("button", { name: "October 20, 2099" });
    expect(clamped).toHaveAttribute("tabindex", "0");
    expect(clamped).not.toBeDisabled();
    await waitFor(() => expect(clamped).toHaveFocus());
  });

  test("Escape closes only the picker, not an enclosing modal", async () => {
    const modalClose = vi.fn();
    const onDocKey = (e: KeyboardEvent) => e.key === "Escape" && modalClose();
    document.addEventListener("keydown", onDocKey);
    try {
      render(<DatePicker value="2026-10-14" onChange={vi.fn()} theme="light" ariaLabel="Date" />);
      fireEvent.click(screen.getByRole("button", { name: "Date" }));
      const day = await screen.findByRole("button", { name: "October 14, 2026" });
      await waitFor(() => expect(day).toHaveFocus());
      fireEvent.keyDown(day, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(modalClose).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", onDocKey);
    }
  });
});
