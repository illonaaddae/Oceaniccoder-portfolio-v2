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
  | "codeblock";

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

  // Toggle off only when every line already carries the prefix, so a partial
  // selection adds rather than silently removing.
  const allPrefixed = lines.every((line) => line.startsWith(prefix));
  const next = lines
    .map((line) => (allPrefixed ? line.slice(prefix.length) : prefix + line))
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
  const allNumbered = lines.every((line) => numbered.test(line));
  const next = lines
    .map((line, i) => (allNumbered ? line.replace(numbered, "") : `${i + 1}. ${line}`))
    .join("\n");

  return {
    value: value.slice(0, from) + next + value.slice(to),
    selectionStart: from,
    selectionEnd: from + next.length,
  };
}

function applyLink(sel: EditorSelection): EditorSelection {
  const { value, selectionStart: start, selectionEnd: end } = sel;
  const selected = value.slice(start, end);
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
  if (action === "link") return applyLink(sel);
  if (action === "codeblock") return applyCodeBlock(sel);

  return sel;
}
