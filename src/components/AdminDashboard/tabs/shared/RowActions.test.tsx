import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RowActions, menuPosition } from "./RowActions";

function setup() {
  const details = vi.fn();
  const archive = vi.fn();
  render(
    <div data-testid="clipper" style={{ overflowX: "auto" }}>
      <RowActions
        label="Actions for REF-1"
        actions={[
          { label: "Details", onSelect: details },
          { label: "Copy reference", onSelect: vi.fn() },
          { label: "Archive", onSelect: archive },
        ]}
      />
    </div>,
  );
  return { details, archive, button: screen.getByRole("button", { name: "Actions for REF-1" }) };
}

describe("RowActions", () => {
  it("opens from the keyboard on the first item and moves with the arrows", async () => {
    const { button } = setup();
    button.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(button).toHaveAttribute("aria-expanded", "true");
    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(items[2]).toHaveFocus(); // wraps to the last item
    await userEvent.keyboard("{Home}");
    expect(items[0]).toHaveFocus();
  });

  it("opens with Enter and runs the chosen item", async () => {
    const { button, archive } = setup();
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{End}{Enter}");
    expect(archive).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("closes on Escape and gives focus back to the button", async () => {
    const { button, details } = setup();
    await userEvent.click(button);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
    expect(details).not.toHaveBeenCalled();
  });

  it("closes on Tab and on a click outside", async () => {
    const { button } = setup();
    await userEvent.click(button);
    await userEvent.keyboard("{Tab}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(button).toHaveFocus();

    await userEvent.click(button);
    await userEvent.click(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  // The table wraps rows in overflow-x-auto, which clips anything absolutely
  // positioned inside it. The menu must live outside that box.
  it("renders the menu outside its scroll container, fixed to the viewport", async () => {
    const { button } = setup();
    await userEvent.click(button);
    const menu = screen.getByRole("menu");
    expect(screen.getByTestId("clipper")).not.toContainElement(menu);
    expect(menu.parentElement).toBe(document.body);
    expect(menu).toHaveStyle({ position: "fixed" });
  });
});

describe("menuPosition", () => {
  const viewport = { width: 1024, height: 768 };

  it("opens below the button, right-aligned to it", () => {
    expect(menuPosition({ top: 100, bottom: 132, right: 900 }, 150, viewport)).toEqual({
      top: 136,
      left: 900 - 224,
    });
  });

  it("opens upward when there isn't room below", () => {
    expect(menuPosition({ top: 700, bottom: 732, right: 900 }, 150, viewport)).toEqual({
      top: 700 - 4 - 150,
      left: 676,
    });
  });

  it("stays below when there is no room above either, and never leaves the sides", () => {
    const tiny = { width: 200, height: 160 };
    const pos = menuPosition({ top: 20, bottom: 52, right: 40 }, 150, tiny);
    expect(pos.top).toBe(56);
    expect(pos.left).toBe(8);
  });
});
