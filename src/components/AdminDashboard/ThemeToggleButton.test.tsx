import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggleButton } from "./ThemeToggleButton";

afterEach(cleanup);

describe("ThemeToggleButton", () => {
  it("offers to switch to light while dark is active", () => {
    render(<ThemeToggleButton theme="dark" onToggle={() => {}} />);

    // The label names the destination, not the current state — otherwise it
    // reads as a status rather than a control.
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("offers to switch to dark while light is active", () => {
    render(<ThemeToggleButton theme="light" onToggle={() => {}} />);

    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });

  it("calls back once per press", () => {
    const onToggle = vi.fn();
    render(<ThemeToggleButton theme="light" onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not submit a surrounding form", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ThemeToggleButton theme="light" onToggle={() => {}} />
      </form>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
