import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MonthPicker } from "./MonthPicker";

function setup(value = "2026-11") {
  const onChange = vi.fn();
  render(<MonthPicker value={value} onChange={onChange} theme="dark" ariaLabel="Month" />);
  return onChange;
}

describe("MonthPicker", () => {
  it("shows the month in words", () => {
    setup();
    expect(screen.getByRole("button", { name: "Month" })).toHaveTextContent("November 2026");
  });

  it("steps one month with the arrows, across the year end", async () => {
    const onChange = setup("2026-12");
    await userEvent.click(screen.getByRole("button", { name: "Next month, Month" }));
    expect(onChange).toHaveBeenLastCalledWith("2027-01");
    await userEvent.click(screen.getByRole("button", { name: "Previous month, Month" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-11");
  });

  it("opens a year of months and picks one", async () => {
    const onChange = setup();
    await userEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "November 2026" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Next year" }));
    await userEvent.click(screen.getByRole("button", { name: "April 2027" }));
    expect(onChange).toHaveBeenCalledWith("2027-04");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves through months with the keyboard and closes on Escape", async () => {
    const onChange = setup();
    await userEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByRole("button", { name: "November 2026" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "March 2027" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("2027-03");

    await userEvent.click(screen.getByRole("button", { name: "Month" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Month" })).toHaveFocus();
  });
});
