import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomSelect } from "./CustomSelect";

const OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "quotes", label: "Quote stages" },
];

describe("CustomSelect", () => {
  it("is named by its visible label plus the selected value when given labelId", () => {
    render(
      <>
        <span id="src-label">Source</span>
        <CustomSelect
          value="all"
          onChange={() => {}}
          options={OPTIONS}
          theme="light"
          labelId="src-label"
        />
      </>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Source All sources");
  });

  it("keeps ariaLabel as the name when no labelId is given", () => {
    render(
      <CustomSelect
        value="all"
        onChange={() => {}}
        options={OPTIONS}
        theme="light"
        ariaLabel="Filter by source"
      />,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Filter by source");
  });

  it("names the open list by the visible label and commits the picked option", async () => {
    const onChange = vi.fn();
    render(
      <>
        <span id="src-label">Source</span>
        <CustomSelect
          value="all"
          onChange={onChange}
          options={OPTIONS}
          theme="dark"
          labelId="src-label"
        />
      </>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toHaveAccessibleName("Source");
    await userEvent.click(screen.getByRole("option", { name: "Quote stages" }));
    expect(onChange).toHaveBeenCalledWith("quotes");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("uses the compact padding for size sm and the default otherwise", () => {
    const { rerender } = render(
      <CustomSelect value="all" onChange={() => {}} options={OPTIONS} theme="light" size="sm" />,
    );
    expect(screen.getByRole("button").className).toContain("py-2");
    rerender(<CustomSelect value="all" onChange={() => {}} options={OPTIONS} theme="light" />);
    expect(screen.getByRole("button").className).toContain("py-3");
  });
});
