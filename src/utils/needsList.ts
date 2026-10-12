/**
 * The "What I'll need from you" list is stored as plain text, one entry per line:
 *   - a line ending in ":" is a group heading,
 *   - any other line is an item (a leading "-", "•" or "*" is dropped),
 *   - a trailing "(...)" on an item is a note shown under it.
 */

export interface NeedItem {
  text: string;
  note: string;
}
export interface NeedGroup {
  heading: string | null;
  items: NeedItem[];
}
export interface ParsedNeeds {
  groups: NeedGroup[];
  count: number;
}
/** One editable row: a group heading or an item (notes stay inside the item text). */
export interface NeedRow {
  kind: "heading" | "item";
  text: string;
}

const BULLET = /^[-•*]\s*/;

/** Split a trailing balanced "(...)" off an item. Unbalanced or leading-only parens stay as text. */
export function splitNote(line: string): NeedItem {
  const s = line.trim();
  if (!s.endsWith(")")) return { text: s, note: "" };
  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ")") depth++;
    else if (s[i] === "(") {
      depth--;
      if (depth === 0) {
        const text = s.slice(0, i).trim();
        const note = s.slice(i + 1, -1).trim();
        return text && note ? { text, note } : { text: s, note: "" };
      }
    }
  }
  return { text: s, note: "" };
}

/** Classify raw text into rows, dropping blanks, bullets and empty headings. */
export function textToRows(text: string): NeedRow[] {
  const rows: NeedRow[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim().replace(BULLET, "").trim();
    if (!line) continue;
    if (line.endsWith(":")) {
      const heading = line.slice(0, -1).trim();
      if (heading) rows.push({ kind: "heading", text: heading });
    } else {
      rows.push({ kind: "item", text: line });
    }
  }
  return rows;
}

/** Rows back to stored text: headings as "Heading:", items as plain lines. Blank rows are dropped. */
export function rowsToText(rows: NeedRow[]): string {
  return rows
    .map((r) => ({ ...r, text: r.text.trim() }))
    .filter((r) => r.text)
    .map((r) => (r.kind === "heading" ? `${r.text.replace(/:+$/, "")}:` : r.text))
    .join("\n");
}

export function parseNeeds(text: string): ParsedNeeds {
  const groups: NeedGroup[] = [];
  let count = 0;
  for (const row of textToRows(text)) {
    if (row.kind === "heading") {
      groups.push({ heading: row.text, items: [] });
      continue;
    }
    if (!groups.length) groups.push({ heading: null, items: [] });
    groups[groups.length - 1].items.push(splitNote(row.text));
    count++;
  }
  return { groups: groups.filter((g) => g.items.length > 0), count };
}

export function serializeNeeds(groups: NeedGroup[]): string {
  const out: string[] = [];
  for (const g of groups) {
    if (g.heading) out.push(`${g.heading}:`);
    for (const it of g.items) out.push(it.note ? `${it.text} (${it.note})` : it.text);
  }
  return out.join("\n");
}
