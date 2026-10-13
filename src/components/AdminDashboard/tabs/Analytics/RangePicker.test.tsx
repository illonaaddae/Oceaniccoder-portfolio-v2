import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RangePicker } from "./RangePicker";

const NOW = new Date("2026-10-13T12:00:00Z");
const range = { from: "2026-09-14", to: "2026-10-13" };
const previous = { from: "2026-08-15", to: "2026-09-13" };

function setup(choice = { preset: "30d" as const }) {
  const onChange = vi.fn();
  render(
    <RangePicker choice={choice} range={range} previous={previous} onChange={onChange} now={NOW} />,
  );
  return { onChange, user: userEvent };
}

describe("RangePicker", () => {
  it("marks the current preset and says what it compares with", () => {
    setup();
    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText(/14 Sep 2026 to 13 Oct 2026, compared with 15 Aug 2026 to 13 Sep 2026/),
    ).toBeInTheDocument();
  });

  it("switches preset", async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "12 months" }));
    expect(onChange).toHaveBeenCalledWith({ preset: "12m" });
  });

  it("refuses a custom range that ends in the future, and says why", async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Custom" }));
    const to = screen.getByLabelText("To");
    await user.clear(to);
    await user.type(to, "2026-10-20");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("alert")).toHaveTextContent("can't be in the future");
    expect(to).toHaveAttribute("aria-invalid", "true");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies a valid custom range", async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Custom" }));
    const from = screen.getByLabelText("From");
    await user.clear(from);
    await user.type(from, "2026-01-01");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenCalledWith({
      preset: "custom",
      from: "2026-01-01",
      to: "2026-10-13",
    });
  });
});
