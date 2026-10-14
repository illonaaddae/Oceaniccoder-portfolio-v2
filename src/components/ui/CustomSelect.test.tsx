import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.getByRole("combobox")).toHaveAccessibleName("Source All sources");
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
    expect(screen.getByRole("combobox")).toHaveAccessibleName("Filter by source");
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
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toHaveAccessibleName("Source");
    await userEvent.click(screen.getByRole("option", { name: "Quote stages" }));
    expect(onChange).toHaveBeenCalledWith("quotes");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("uses the compact padding for size sm and the default otherwise", () => {
    const { rerender } = render(
      <CustomSelect value="all" onChange={() => {}} options={OPTIONS} theme="light" size="sm" />,
    );
    expect(screen.getByRole("combobox").className).toContain("py-2");
    rerender(<CustomSelect value="all" onChange={() => {}} options={OPTIONS} theme="light" />);
    expect(screen.getByRole("combobox").className).toContain("py-3");
  });

  it("points aria-activedescendant at the option the arrows highlight", async () => {
    render(
      <CustomSelect
        value="all"
        onChange={() => {}}
        options={OPTIONS}
        theme="light"
        ariaLabel="Source"
      />,
    );
    const box = screen.getByRole("combobox");
    box.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(box).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
    const active = () => document.getElementById(box.getAttribute("aria-activedescendant")!);
    expect(active()).toHaveTextContent("All sources");
    await userEvent.keyboard("{ArrowDown}");
    expect(active()).toHaveTextContent("Quote stages");
  });

  it("closes when focus tabs away, so the panel can't cover the next field", async () => {
    render(
      <>
        <CustomSelect
          value="all"
          onChange={() => {}}
          options={OPTIONS}
          theme="light"
          ariaLabel="Source"
        />
        <button type="button">Next field</button>
      </>,
    );
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Next field" })).toHaveFocus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("stays open when the pointer lands on a group header", async () => {
    render(
      <CustomSelect
        value="a"
        onChange={() => {}}
        groups={[{ group: "Letters", options: [{ value: "a", label: "A" }] }]}
        theme="light"
        ariaLabel="Pick"
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByText("Letters"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("puts each group's options in a role=group named by its heading", async () => {
    render(
      <CustomSelect
        value="a"
        onChange={() => {}}
        groups={[
          { group: "Letters", options: [{ value: "a", label: "A" }] },
          { group: "Numbers", options: [{ value: "1", label: "One" }] },
        ]}
        theme="dark"
        ariaLabel="Pick"
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    const numbers = screen.getByRole("group", { name: "Numbers" });
    expect(within(numbers).getByRole("option", { name: "One" })).toBeInTheDocument();
    expect(within(screen.getByRole("listbox")).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("returns focus to the trigger after picking from the search box", async () => {
    const onChange = vi.fn();
    render(
      <CustomSelect
        value="all"
        onChange={onChange}
        options={OPTIONS}
        theme="light"
        ariaLabel="Source"
        searchable
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByPlaceholderText("Search…");
    await waitFor(() => expect(search).toHaveFocus());
    await userEvent.type(search, "quote{Enter}");
    expect(onChange).toHaveBeenCalledWith("quotes");
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("commits the highlighted option on Space and jumps with Home/End", async () => {
    const onChange = vi.fn();
    const three = [...OPTIONS, { value: "oneoff", label: "One-off" }];
    render(
      <CustomSelect
        value="all"
        onChange={onChange}
        options={three}
        theme="light"
        ariaLabel="Source"
      />,
    );
    const box = screen.getByRole("combobox");
    box.focus();
    await userEvent.keyboard("{ArrowDown}{End}");
    expect(document.getElementById(box.getAttribute("aria-activedescendant")!)).toHaveTextContent(
      "One-off",
    );
    await userEvent.keyboard("{Home}");
    expect(document.getElementById(box.getAttribute("aria-activedescendant")!)).toHaveTextContent(
      "All sources",
    );
    await userEvent.keyboard("{ArrowDown} ");
    expect(onChange).toHaveBeenCalledWith("quotes");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("stops Escape at the dropdown so an enclosing modal stays open", async () => {
    const modalClose = vi.fn();
    const onDocKey = (e: KeyboardEvent) => e.key === "Escape" && modalClose();
    document.addEventListener("keydown", onDocKey);
    try {
      render(
        <CustomSelect
          value="all"
          onChange={() => {}}
          options={OPTIONS}
          theme="light"
          ariaLabel="Source"
        />,
      );
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(modalClose).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", onDocKey);
    }
  });

  it("leaves Home/End to the text cursor in the search box", async () => {
    render(
      <CustomSelect
        value="all"
        onChange={() => {}}
        options={OPTIONS}
        theme="light"
        ariaLabel="Source"
        searchable
      />,
    );
    const box = screen.getByRole("combobox");
    await userEvent.click(box);
    const search = await screen.findByPlaceholderText<HTMLInputElement>("Search…");
    await waitFor(() => expect(search).toHaveFocus());
    await userEvent.type(search, "qu{End}");
    const highlighted = () => document.getElementById(box.getAttribute("aria-activedescendant")!);
    expect(highlighted()).toHaveTextContent("Quote stages");
    await userEvent.keyboard("{Home}");
    expect(search.selectionStart).toBe(0);
    expect(highlighted()).toHaveTextContent("Quote stages");
  });
});
