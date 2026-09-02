import { looksLikeUrl, normalizeUrl } from "../../../../utils/linkHref";

/**
 * Markdown editing primitives for the blog content toolbar.
 *
 * These are pure: they take the textarea's value and selection, and return the
 * new value plus where the selection should land. Keeping them free of DOM and
 * React makes the fiddly parts — toggling, multi-line prefixes, where the
 * cursor ends up — directly testable.
 *
 * The stored format stays Markdown. The toolbar only saves you typing the
 * punctuation; nothing about how posts are stored or rendered changes.
 */

export type ToolbarAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "h2"
  | "h3"
  | "quote"
  | "ul"
  | "ol"
  | "link"
  | "codeblock"
  | "tasklist"
  | "indent"
  | "outdent";

export interface EditorSelection {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Text wrapped on both sides, e.g. **bold**. */
const WRAPPERS: Partial<Record<ToolbarAction, string>> = {
  bold: "**",
  italic: "*",
  strikethrough: "~~",
  code: "`",
};

/** Prefixes applied to the start of every selected line. */
const LINE_PREFIXES: Partial<Record<ToolbarAction, string>> = {
  h2: "## ",
  h3: "### ",
  quote: "> ",
  ul: "- ",
};

/** Placeholder inserted when the action is used with nothing selected. */
const PLACEHOLDERS: Partial<Record<ToolbarAction, string>> = {
  bold: "bold text",
  italic: "italic text",
  strikethrough: "struck text",
  code: "code",
  h2: "Heading",
  h3: "Subheading",
  quote: "Quote",
  ul: "List item",
  ol: "List item",
  tasklist: "To do",
};

export const TOOLBAR_LABELS: Record<ToolbarAction, string> = {
  bold: "Bold",
  italic: "Italic",
  strikethrough: "Strikethrough",
  code: "Inline code",
  h2: "Heading",
  h3: "Subheading",
  quote: "Quote",
  ul: "Bulleted list",
  ol: "Numbered list",
  link: "Link",
  codeblock: "Code block",
  tasklist: "Checklist",
  indent: "Indent",
  outdent: "Outdent",
};

/** Keyboard shortcuts, matched against a Cmd/Ctrl-modified keypress. */
export const TOOLBAR_SHORTCUTS: Partial<Record<string, ToolbarAction>> = {
  b: "bold",
  i: "italic",
  k: "link",
};

function applyWrap(sel: EditorSelection, marker: string, action: ToolbarAction): EditorSelection {
  const { value, selectionStart: start, selectionEnd: end } = sel;
  const selected = value.slice(start, end);
  const len = marker.length;

  // "*" is a prefix of "**", so a naive check would see italic markers inside
  // "**bold**" and unwrap it into "*bold*" — silently turning bold into
  // italic. Treat the marker as matched only when it is not part of a longer
  // run of the same character.
  const char = marker[0];
  const runInside = selected[len] === char || selected[selected.length - len - 1] === char;
  const runOutside = value[start - len - 1] === char || value[end + len] === char;

  // Already wrapped — unwrap, so the button toggles instead of stacking
  // markers into ****text****.
  const inside =
    selected.startsWith(marker) &&
    selected.endsWith(marker) &&
    selected.length > 2 * len &&
    !runInside;
  if (inside) {
    const stripped = selected.slice(len, -len);
    return {
      value: value.slice(0, start) + stripped + value.slice(end),
      selectionStart: start,
      selectionEnd: start + stripped.length,
    };
  }
  const outside =
    value.slice(start - len, start) === marker &&
    value.slice(end, end + len) === marker &&
    !runOutside;
  if (outside) {
    return {
      value: value.slice(0, start - len) + selected + value.slice(end + len),
      selectionStart: start - len,
      selectionEnd: end - len,
    };
  }

  const body = selected || PLACEHOLDERS[action] || "";
  return {
    value: value.slice(0, start) + marker + body + marker + value.slice(end),
    selectionStart: start + len,
    selectionEnd: start + len + body.length,
  };
}

/** A line with nothing but whitespace separates items; it is never one. */
const isBlank = (line: string) => line.trim() === "";

/** Expands a selection outwards to cover whole lines. */
function lineBounds(value: string, start: number, end: number) {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end);
  const to = nextBreak === -1 ? value.length : nextBreak;
  return { from, to };
}

function applyLinePrefix(
  sel: EditorSelection,
  prefix: string,
  action: ToolbarAction,
): EditorSelection {
  const { value, selectionStart: start, selectionEnd: end } = sel;
  const { from, to } = lineBounds(value, start, end);
  const block = value.slice(from, to) || PLACEHOLDERS[action] || "";
  const lines = block.split("\n");

  // Blank lines are separators, not items. Prefixing them produced an empty
  // "- " between every paragraph, which renders as a bullet with nothing after
  // it — the lone dot that made bulleting a set of paragraphs look broken.
  const content = lines.filter((line) => !isBlank(line));

  // Toggle off only when every line that could carry the prefix already does,
  // so a partial selection adds rather than silently removing.
  const allPrefixed = content.length > 0 && content.every((line) => line.startsWith(prefix));
  const next = lines
    .map((line) => {
      if (isBlank(line)) return line;
      return allPrefixed ? line.slice(prefix.length) : prefix + line;
    })
    .join("\n");

  return {
    value: value.slice(0, from) + next + value.slice(to),
    selectionStart: from,
    selectionEnd: from + next.length,
  };
}

function applyOrderedList(sel: EditorSelection): EditorSelection {
  const { value, selectionStart: start, selectionEnd: end } = sel;
  const { from, to } = lineBounds(value, start, end);
  const block = value.slice(from, to) || PLACEHOLDERS.ol || "";
  const lines = block.split("\n");

  const numbered = /^\d+\.\s/;
  const content = lines.filter((line) => !isBlank(line));
  const allNumbered = content.length > 0 && content.every((line) => numbered.test(line));

  // Blank separators keep their place and do not consume a number, so the
  // sequence runs 1, 2, 3 across the items rather than skipping.
  let n = 0;
  const next = lines
    .map((line) => {
      if (isBlank(line)) return line;
      if (allNumbered) return line.replace(numbered, "");
      n += 1;
      return `${n}. ${line}`;
    })
    .join("\n");

  return {
    value: value.slice(0, from) + next + value.slice(to),
    selectionStart: from,
    selectionEnd: from + next.length,
  };
}

/** Matches a task item at the start of a line, checked or not. */
const TASK_MARKER = /^(\s*)- \[[ xX]\] /;

function applyTaskList(sel: EditorSelection): EditorSelection {
  const { value, selectionStart: start, selectionEnd: end } = sel;
  const { from, to } = lineBounds(value, start, end);
  const block = value.slice(from, to) || PLACEHOLDERS.tasklist || "";
  const lines = block.split("\n");

  // Toggling off has to accept "- [x] " as well as "- [ ] ", or a list you had
  // ticked through could never be turned back into plain text.
  const content = lines.filter((line) => !isBlank(line));
  const allTasks = content.length > 0 && content.every((line) => TASK_MARKER.test(line));
  const next = lines
    .map((line) => {
      if (isBlank(line)) return line;
      if (allTasks) return line.replace(TASK_MARKER, "$1");
      // Already a task (in a mixed selection) — leave it be, or the bullet
      // branch below would turn "- [ ] Done" into "- [ ] [ ] Done".
      if (TASK_MARKER.test(line)) return line;
      // Promote an existing bullet rather than stacking a second marker on it.
      const bullet = line.match(/^(\s*)- /);
      return bullet ? line.replace(/^(\s*)- /, "$1- [ ] ") : `- [ ] ${line}`;
    })
    .join("\n");

  return {
    value: value.slice(0, from) + next + value.slice(to),
    selectionStart: from,
    selectionEnd: from + next.length,
  };
}

const INDENT = "  ";

/** Shifts whole lines in or out by one level, for nesting list items. */
function applyIndent(sel: EditorSelection, direction: 1 | -1): EditorSelection {
  const { value, selectionStart: start, selectionEnd: end } = sel;
  const { from, to } = lineBounds(value, start, end);
  const lines = value.slice(from, to).split("\n");

  const next = lines
    .map((line) =>
      direction === 1
        ? INDENT + line
        : line.startsWith(INDENT)
          ? line.slice(INDENT.length)
          : line.replace(/^\s+/, ""),
    )
    .join("\n");

  return {
    value: value.slice(0, from) + next + value.slice(to),
    selectionStart: from,
    selectionEnd: from + next.length,
  };
}

/** True when the caret sits on a list line, where Tab should nest. */
export function isOnListLine(value: string, caret: number): boolean {
  const from = value.lastIndexOf("\n", caret - 1) + 1;
  const nextBreak = value.indexOf("\n", caret);
  const line = value.slice(from, nextBreak === -1 ? value.length : nextBreak);
  return /^\s*(?:[-*+]|\d+\.)\s/.test(line);
}

function applyLink(sel: EditorSelection): EditorSelection {
  const { value, selectionStart: start, selectionEnd: end } = sel;
  const selected = value.slice(start, end);

  /*
   * A selected URL belongs in the href, not the label. Getting this backwards
   * is what shipped `[https://example.com](url)` into published posts: `url`
   * is a relative path, so the link pointed back at our own site and the
   * router answered "Page not found".
   */
  if (looksLikeUrl(selected)) {
    const href = normalizeUrl(selected) ?? selected.trim();
    const label = "link text";
    const inserted = `[${label}](${href})`;
    return {
      value: value.slice(0, start) + inserted + value.slice(end),
      selectionStart: start + 1,
      selectionEnd: start + 1 + label.length,
    };
  }

  const text = selected || "link text";
  const inserted = `[${text}](url)`;
  // Leave "url" selected — that is the part you always have to replace.
  const urlStart = start + inserted.length - 4;
  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    selectionStart: urlStart,
    selectionEnd: urlStart + 3,
  };
}

function applyCodeBlock(sel: EditorSelection): EditorSelection {
  const { value, selectionStart: start, selectionEnd: end } = sel;
  const selected = value.slice(start, end) || "code";
  // Fences need their own lines or the renderer treats them as inline text.
  const before = start === 0 || value[start - 1] === "\n" ? "" : "\n";
  const after = end === value.length || value[end] === "\n" ? "" : "\n";
  const inserted = `${before}\`\`\`\n${selected}\n\`\`\`${after}`;
  const bodyStart = start + before.length + 4;
  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    selectionStart: bodyStart,
    selectionEnd: bodyStart + selected.length,
  };
}

/**
 * Applies a toolbar action to the current selection.
 * Returns the new value and where the selection should be restored.
 */
export function applyMarkdown(action: ToolbarAction, sel: EditorSelection): EditorSelection {
  const wrapper = WRAPPERS[action];
  if (wrapper) return applyWrap(sel, wrapper, action);

  const prefix = LINE_PREFIXES[action];
  if (prefix) return applyLinePrefix(sel, prefix, action);

  if (action === "ol") return applyOrderedList(sel);
  if (action === "tasklist") return applyTaskList(sel);
  if (action === "indent") return applyIndent(sel, 1);
  if (action === "outdent") return applyIndent(sel, -1);
  if (action === "link") return applyLink(sel);
  if (action === "codeblock") return applyCodeBlock(sel);

  return sel;
}
