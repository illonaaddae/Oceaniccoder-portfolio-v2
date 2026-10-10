import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectDropdown from "./SelectDropdown";

const options = ["Portfolio Website", "E-Commerce Store", "Web Application", "Mobile App"];

describe("SelectDropdown", () => {
  it("stays open while the list itself is scrolled", async () => {
    render(<SelectDropdown value="" onChange={vi.fn()} options={options} />);
    userEvent.click(screen.getByRole("button", { name: /select/i }));
    const list = screen.getByRole("listbox");
    fireEvent.scroll(list);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes when the page scrolls", async () => {
    render(<SelectDropdown value="" onChange={vi.fn()} options={options} />);
    userEvent.click(screen.getByRole("button", { name: /select/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.scroll(window);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("selects an option and closes", async () => {
    const onChange = vi.fn();
    render(<SelectDropdown value="" onChange={onChange} options={options} />);
    userEvent.click(screen.getByRole("button", { name: /select/i }));
    userEvent.click(screen.getByRole("option", { name: "Mobile App" }));
    expect(onChange).toHaveBeenCalledWith("Mobile App");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on Escape and exposes listbox semantics", async () => {
    render(<SelectDropdown value="Mobile App" onChange={vi.fn()} options={options} />);
    const trigger = screen.getByRole("button", { name: /mobile app/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("option", { name: "Mobile App" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    screen.getByRole("option", { name: "Mobile App" }).focus();
    userEvent.keyboard("{esc}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("ignores Escape while closed and leaves other fields focused", () => {
    render(
      <>
        <input aria-label="name" />
        <SelectDropdown value="" onChange={vi.fn()} options={options} />
      </>,
    );
    const input = screen.getByLabelText("name");
    input.focus();
    userEvent.keyboard("{esc}");
    expect(input).toHaveFocus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when the window is resized", () => {
    render(<SelectDropdown value="" onChange={vi.fn()} options={options} />);
    userEvent.click(screen.getByRole("button", { name: /select/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent(window, new Event("resize"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
