import React from "react";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import { RowActions, type RowAction } from "./RowActions";

export const muted: React.CSSProperties = { color: "var(--text-secondary)" };
export const strong: React.CSSProperties = { color: "var(--text-primary)" };

export interface Column<T> {
  header: string;
  /** Classes for the cell after the shared padding, e.g. "whitespace-nowrap". */
  className?: string;
  style?: React.CSSProperties;
  align?: "right";
  cell: (row: T) => React.ReactNode;
}

export interface RowMenu {
  actions: RowAction[];
  note?: string;
}

interface DataTableProps<T> {
  /** Names the table and the mobile list for screen readers. */
  caption: string;
  rows: T[];
  rowKey: (row: T) => string;
  /** Short name used in "Details for …" and "Actions for …". */
  rowName: (row: T) => string;
  /** The first column also holds the details toggle. */
  columns: Column<T>[];
  /** Mobile card: header (left of the menu), body (left) and aside (right). */
  card: {
    header: (row: T) => React.ReactNode;
    body: (row: T) => React.ReactNode;
    aside: (row: T) => React.ReactNode;
  };
  details: (row: T, id: string) => React.ReactNode;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  actionsFor: (row: T) => RowMenu;
  /** Prefix for the details panel ids, unique per tab. */
  idPrefix: string;
}

/** Clicks on controls inside a row shouldn't also toggle its details. */
const fromControl = (e: React.MouseEvent) =>
  Boolean((e.target as HTMLElement).closest("button, a, [role='menu']"));

function ToggleButton({
  name,
  open,
  controls,
  onToggle,
}: {
  name: string;
  open: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const Icon = open ? FaChevronDown : FaChevronRight;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`Details for ${name}`}
      className="rounded p-1 focus-visible:outline focus-visible:outline-2"
      style={muted}
    >
      <Icon aria-hidden="true" className="text-xs" />
    </button>
  );
}

/**
 * Table on md and up, stacked cards below; both get the same page of rows.
 * Each row expands into a details panel (toggle button, or a click anywhere
 * on the row that isn't a control) and has an actions menu.
 */
export function DataTable<T>({
  caption,
  rows,
  rowKey,
  rowName,
  columns,
  card,
  details,
  expanded,
  onToggle,
  actionsFor,
  idPrefix,
}: DataTableProps<T>) {
  return (
    <>
      <div className="glass-card hidden overflow-x-auto rounded-xl md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "var(--border-subtle)" }}>
              {columns.map((c) => (
                <th
                  key={c.header}
                  scope="col"
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                  style={muted}
                >
                  {c.header}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row);
              const name = rowName(row);
              const open = expanded.has(key);
              const detailsId = `${idPrefix}-details-${key}`;
              const { actions, note } = actionsFor(row);
              return (
                <React.Fragment key={key}>
                  <tr
                    onClick={(e) => {
                      if (!fromControl(e)) onToggle(key);
                    }}
                    className="cursor-pointer border-b transition hover:bg-[var(--accent-teal-subtle)]"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    {columns.map((c, i) => (
                      <td
                        key={c.header}
                        className={`px-4 py-3 ${c.align === "right" ? "text-right " : ""}${
                          c.className ?? ""
                        }`}
                        style={c.style}
                      >
                        {i === 0 ? (
                          <span className="inline-flex items-center gap-2">
                            <ToggleButton
                              name={name}
                              open={open}
                              controls={detailsId}
                              onToggle={() => onToggle(key)}
                            />
                            {c.cell(row)}
                          </span>
                        ) : (
                          c.cell(row)
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <RowActions label={`Actions for ${name}`} actions={actions} note={note} />
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                      <td colSpan={columns.length + 1} className="px-4 py-4">
                        {details(row, detailsId)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((row) => {
          const key = rowKey(row);
          const name = rowName(row);
          const open = expanded.has(key);
          const detailsId = `${idPrefix}-card-details-${key}`;
          const { actions, note } = actionsFor(row);
          return (
            <li key={key} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">{card.header(row)}</div>
                <RowActions label={`Actions for ${name}`} actions={actions} note={note} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0 flex-1 text-sm">{card.body(row)}</div>
                <div className="flex-shrink-0 whitespace-nowrap text-right">{card.aside(row)}</div>
              </div>
              <button
                type="button"
                onClick={() => onToggle(key)}
                aria-expanded={open}
                aria-controls={detailsId}
                className="mt-3 text-xs font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--accent-teal)" }}
              >
                {open ? "Hide details" : "Details"}
              </button>
              {open && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--border-subtle)" }}>
                  {details(row, detailsId)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
