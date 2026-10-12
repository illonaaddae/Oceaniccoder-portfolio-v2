import type { NeedsGroup, NeedsRow, NeedsTables } from "@/types/quote";
import { newId } from "./quoteMath";
import { splitNote, textToRows } from "./needsList";

/**
 * Helpers for the "What I'll need from you" tables (`extras.needs`). The
 * server's parseNeedsTables (api/shared/quotes/model.js) is the authority on
 * what gets stored; these only build and inspect editor state.
 */

export function emptyNeedsRow(over: Partial<NeedsRow> = {}): NeedsRow {
  return { id: newId("row"), item: "", detail: "", when: "", ...over };
}

export function emptyNeedsGroup(over: Partial<NeedsGroup> = {}): NeedsGroup {
  return {
    id: newId("group"),
    title: "",
    intro: "",
    detailLabel: "Used for",
    rows: [emptyNeedsRow()],
    footnote: "",
    ...over,
  };
}

/** Rows the client will actually see (an item is required; blank rows are dropped on save). */
export function visibleRows(group: NeedsGroup): NeedsRow[] {
  return group.rows.filter((r) => r.item.trim());
}

export function needsRowCount(needs: NeedsTables | null | undefined): number {
  return (needs?.groups ?? []).reduce((n, g) => n + visibleRows(g).length, 0);
}

/** True when nothing has been typed into the tables at all. */
export function isNeedsBlank(needs: NeedsTables | null | undefined): boolean {
  if (!needs) return true;
  if (needs.intro.trim()) return false;
  return needs.groups.every(
    (g) =>
      !g.title.trim() &&
      !g.intro.trim() &&
      !g.footnote.trim() &&
      g.rows.every((r) => !r.item.trim() && !r.detail.trim() && !r.when.trim()),
  );
}

const BULLET = /^[-•*]\s*/;

/**
 * Rows from text copied out of a table. Cells split on TAB (what Google Docs
 * and Word put on the clipboard) or on " | "; columns are item, detail, when.
 * A first row whose first cell is "Item" is a header and is skipped. Lines
 * with no separator become item-only rows.
 */
export function parsePastedRows(text: string): NeedsRow[] {
  const rows: NeedsRow[] = [];
  let first = true;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const cells = (raw.includes("\t") ? raw.split("\t") : raw.split(" | ")).map((c) => c.trim());
    const isHeader = first && cells[0].toLowerCase() === "item";
    first = false;
    if (isHeader) continue;
    const [item = "", detail = "", when = ""] = cells;
    const clean = item.replace(BULLET, "").trim();
    if (!clean && !detail && !when) continue;
    rows.push(emptyNeedsRow({ item: clean, detail, when }));
  }
  return rows;
}

/**
 * The old plain-text checklist (`assumptions`) as tables: lines ending in ":"
 * start a new group, other lines become rows, and lines before any heading go
 * in a group called "Items". A trailing "(...)" note becomes the row's notes.
 */
export function legacyToNeedsTables(text: string): NeedsTables {
  const groups: NeedsGroup[] = [];
  const start = (title: string) => {
    const g = emptyNeedsGroup({ title, detailLabel: "Notes", rows: [] });
    groups.push(g);
    return g;
  };
  let current: NeedsGroup | null = null;
  for (const row of textToRows(text)) {
    if (row.kind === "heading") {
      current = start(row.text);
      continue;
    }
    current ??= start("Items");
    const { text: item, note } = splitNote(row.text);
    current.rows.push(emptyNeedsRow({ item, detail: note }));
  }
  return { intro: "", groups: groups.filter((g) => g.rows.length > 0) };
}
