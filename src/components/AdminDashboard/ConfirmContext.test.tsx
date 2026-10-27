import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { ConfirmProvider, useConfirm } from "./ConfirmContext";
import { Modal } from "./modals/Modal";

describe("useConfirm", () => {
  it("throws outside a ConfirmProvider instead of silently cancelling", () => {
    // React logs the render error before rethrowing it; keep the output clean.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useConfirm())).toThrow(
      "useConfirm must be used within a ConfirmProvider",
    );
    consoleError.mockRestore();
  });

  it("returns the provider's confirm function inside a ConfirmProvider", () => {
    const { result } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider });
    expect(result.current).toBeTypeOf("function");
  });
});

// Renders a trigger button that opens the dialog and records what it settles to.
function setup() {
  const results: Array<boolean | string> = [];
  let confirm: ReturnType<typeof useConfirm> = () => Promise.resolve(false);
  const Trigger = () => {
    confirm = useConfirm();
    return (
      <button
        type="button"
        onClick={() => {
          void confirm({ message: 'Delete "Shop"?', description: "This cannot be undone." }).then(
            (v) => results.push(v),
          );
        }}
      >
        Remove Shop
      </button>
    );
  };
  const { unmount } = render(
    <ConfirmProvider>
      <Trigger />
    </ConfirmProvider>,
  );
  const trigger = screen.getByRole("button", { name: "Remove Shop" });
  const open = () => {
    trigger.focus();
    fireEvent.click(trigger);
  };
  return {
    results,
    trigger,
    open,
    unmount,
    confirm: (...args: Parameters<typeof confirm>) => confirm(...args),
  };
}

describe("ConfirmProvider dialog", () => {
  it("is an alert dialog named by its title and described by its message", () => {
    const { open } = setup();
    open();

    const dialog = screen.getByRole("alertdialog", { name: 'Delete "Shop"?' });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
    expect(screen.getByRole("heading", { level: 2, name: 'Delete "Shop"?' })).toBeInTheDocument();
  });

  it("moves focus to Cancel, not the destructive button, when it opens", () => {
    const { open } = setup();
    open();

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("makes the page behind it inert while open, and live again once closed", () => {
    const { open, trigger } = setup();
    open();

    expect(trigger.closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("alertdialog").closest("[inert]")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(trigger.closest("[inert]")).toBeNull();
  });

  it("locks page scroll while open and unlocks it once closed", () => {
    const { open } = setup();
    open();
    expect(document.documentElement).toHaveClass("confirm-open");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.documentElement).not.toHaveClass("confirm-open");
  });

  it("keeps the scroll lock of a Modal underneath after it closes", () => {
    document.body.style.overflow = "hidden";
    try {
      const { open } = setup();
      open();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(document.body.style.overflow).toBe("hidden");
    } finally {
      document.body.style.overflow = "";
    }
  });

  // The dialog used to save body overflow on open and restore it on close. A
  // Modal that closed in between had its lock written back.
  it("leaves the page unlocked when a Modal under it closes first and it is then cancelled", async () => {
    const EditorWithDelete = () => {
      const confirm = useConfirm();
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            Close editor
          </button>
          <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit project" theme="dark">
            <button type="button" onClick={() => void confirm("Delete project?")}>
              Delete project
            </button>
          </Modal>
        </>
      );
    };
    render(
      <ConfirmProvider>
        <EditorWithDelete />
      </ConfirmProvider>,
    );
    try {
      fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
      fireEvent.click(screen.getByRole("button", { name: "Close editor" }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      });

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(document.body.style.overflow).not.toBe("hidden");
      expect(document.documentElement).not.toHaveClass("confirm-open");
    } finally {
      document.body.style.overflow = "";
    }
  });

  it("closes and resolves false on Escape", async () => {
    const { open, results } = setup();
    open();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await act(async () => {});

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(results).toEqual([false]);
  });

  it("keeps Escape from also closing a Modal underneath it", async () => {
    const onModalClose = vi.fn();
    const DeleteInsideModal = () => {
      const confirm = useConfirm();
      return (
        <Modal isOpen onClose={onModalClose} title="Edit project" theme="dark">
          <button type="button" onClick={() => void confirm("Delete project?")}>
            Delete project
          </button>
        </Modal>
      );
    };
    render(
      <ConfirmProvider>
        <DeleteInsideModal />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await act(async () => {});

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onModalClose).not.toHaveBeenCalled();
  });

  it("leaves an element that was already inert before it opened inert after it closes", () => {
    const alreadyInert = document.createElement("div");
    alreadyInert.setAttribute("inert", "");
    document.body.appendChild(alreadyInert);
    try {
      const { open } = setup();
      open();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(alreadyInert).toHaveAttribute("inert");
    } finally {
      alreadyInert.remove();
    }
  });

  it("returns focus to the element that opened it", async () => {
    const { open, trigger } = setup();
    open();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveFocus();

    fireEvent.click(cancel);
    await act(async () => {});

    expect(trigger).toHaveFocus();
  });

  it("falls back to the main region when the element that opened it is gone", async () => {
    // Like a row menu that closes as soon as its Delete item is clicked.
    const Menu = () => {
      const confirm = useConfirm();
      const [open, setOpen] = useState(true);
      return (
        <main tabIndex={-1}>
          {open && (
            <button
              type="button"
              onClick={() => {
                void confirm("Delete project?");
                setOpen(false);
              }}
            >
              Delete
            </button>
          )}
        </main>
      );
    };
    render(
      <ConfirmProvider>
        <Menu />
      </ConfirmProvider>,
    );
    const item = screen.getByRole("button", { name: "Delete" });
    item.focus();
    fireEvent.click(item);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => {});

    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("settles an open dialog as cancelled when a second confirm replaces it", async () => {
    const { open, results, confirm, trigger } = setup();
    open();

    let second: Promise<boolean | string> | undefined;
    act(() => {
      second = confirm("Archive invoice?");
    });
    await act(async () => {});

    expect(results).toEqual([false]);
    expect(screen.getByRole("alertdialog", { name: "Archive invoice?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await expect(second).resolves.toBe(true);
    // Focus goes back to what opened the first dialog, not to the first dialog's Cancel.
    expect(trigger).toHaveFocus();
  });

  it("returns focus to the first trigger when a caller chains a second confirm after the first settles", async () => {
    const { open, confirm, trigger } = setup();
    open();
    const firstDelete = screen.getByRole("button", { name: "Delete" });
    firstDelete.focus();

    // A caller that awaits the first answer and asks again runs before React
    // unmounts the first dialog, so focus is still on the first dialog's button.
    let second: Promise<boolean | string> | undefined;
    act(() => {
      fireEvent.click(firstDelete);
      second = confirm("Archive invoice?");
    });
    expect(screen.getByRole("alertdialog", { name: "Archive invoice?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await expect(second).resolves.toBe(false);
    expect(trigger).toHaveFocus();
  });

  it("settles an open dialog as cancelled when the provider unmounts", async () => {
    const { open, results, unmount } = setup();
    open();

    unmount();
    await act(async () => {});

    expect(results).toEqual([false]);
  });
});
