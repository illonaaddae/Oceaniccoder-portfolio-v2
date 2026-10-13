import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { FaEllipsisH } from "react-icons/fa";

export interface RowAction {
  label: string;
  onSelect: () => void;
}

interface RowActionsProps {
  /** Names the row for screen readers, e.g. "Actions for INV-2026-0042". */
  label: string;
  actions: RowAction[];
  /** Shown in the menu under the actions, e.g. why Archive is missing. */
  note?: string;
}

const MENU_WIDTH = 224; // w-56
const GAP = 4;
const EDGE = 8;

/**
 * Where to put the menu: under the button, right-aligned to it, or above it
 * when there isn't room below. Clamped so it never leaves the viewport.
 */
export function menuPosition(
  button: { top: number; bottom: number; right: number },
  menuHeight: number,
  viewport: { width: number; height: number },
): { top: number; left: number } {
  const left = Math.min(
    Math.max(EDGE, button.right - MENU_WIDTH),
    viewport.width - MENU_WIDTH - EDGE,
  );
  const below = button.bottom + GAP;
  const fitsBelow = below + menuHeight <= viewport.height - EDGE;
  const above = button.top - GAP - menuHeight;
  const top = fitsBelow || above < EDGE ? below : above;
  return { top, left: Math.max(EDGE, left) };
}

/**
 * A small actions menu (menu button pattern): Enter, Space or ArrowDown opens
 * it on the first item, arrows move, Escape closes and returns focus to the
 * button, Tab or a click outside closes it.
 *
 * The menu is portalled to <body> with position: fixed, so the table's
 * overflow-x-auto wrapper can't clip it on the last rows.
 */
export function RowActions({ label, actions, note }: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const place = useCallback(() => {
    if (!button.current || !menu.current) return;
    setPos(
      menuPosition(button.current.getBoundingClientRect(), menu.current.offsetHeight, {
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    );
  }, []);

  // Measure once the menu is in the DOM, before paint, so it never flashes
  // in the wrong place.
  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    items.current[0]?.focus();
    const onOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!button.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items.current.filter((el): el is HTMLButtonElement => Boolean(el));
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => {
      e.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") move(at + 1);
    else if (e.key === "ArrowUp") move(at - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(list.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      // The menu lives at the end of <body>; send focus back to the row.
      e.preventDefault();
      close(true);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="rounded-lg border p-2 transition hover:bg-[var(--accent-teal-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
      >
        <FaEllipsisH aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            tabIndex={-1}
            aria-label={label}
            onKeyDown={onMenuKey}
            className="z-[70] overflow-hidden rounded-xl border py-1 shadow-xl"
            style={{
              position: "fixed",
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: MENU_WIDTH,
              // Transparent until measured, so no frame shows it at 0,0. Not
              // visibility: hidden, which would make the first item unfocusable.
              opacity: pos ? 1 : 0,
              background: "var(--bg-primary)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {actions.map((a, i) => (
              <button
                key={a.label}
                ref={(el) => {
                  items.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(true);
                  a.onSelect();
                }}
                className="block w-full px-4 py-2 text-left text-sm transition hover:bg-[var(--accent-teal-subtle)] focus:bg-[var(--accent-teal-subtle)] focus:outline-none"
                style={{ color: "var(--text-primary)" }}
              >
                {a.label}
              </button>
            ))}
            {note && (
              <p
                role="presentation"
                className="border-t px-4 py-2 text-xs"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                {note}
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
