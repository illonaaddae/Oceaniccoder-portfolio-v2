import { describe, expect, it } from "vitest";
import { applyMarkdown, EditorSelection, isOnListLine } from "./markdownActions";

/** Builds a selection from a string with the selected span marked by |…|. */
function sel(marked: string): EditorSelection {
  const first = marked.indexOf("|");
  const second = marked.indexOf("|", first + 1);
  const value = marked.replace(/\|/g, "");
  return { value, selectionStart: first, selectionEnd: second - 1 };
}

/** Renders a result back into the |…| notation so assertions read clearly. */
function show(r: EditorSelection): string {
  return (
    r.value.slice(0, r.selectionStart) +
    "|" +
    r.value.slice(r.selectionStart, r.selectionEnd) +
    "|" +
    r.value.slice(r.selectionEnd)
  );
}

describe("applyMarkdown — wrapping", () => {
  it("wraps the selection and keeps the text selected", () => {
    expect(show(applyMarkdown("bold", sel("hello |world|")))).toBe("hello **|world|**");
  });

  it("inserts a placeholder when nothing is selected", () => {
    expect(show(applyMarkdown("bold", sel("hello ||")))).toBe("hello **|bold text|**");
  });

  it("unwraps when the markers are inside the selection", () => {
    expect(show(applyMarkdown("bold", sel("hello |**world**|")))).toBe("hello |world|");
  });

  it("unwraps when the markers sit just outside the selection", () => {
    expect(show(applyMarkdown("bold", sel("hello **|world|**")))).toBe("hello |world|");
  });

  it("does not confuse italic with an already-bold span", () => {
    // A single "*" marker must not treat "**x**" as its own wrapping.
    expect(applyMarkdown("italic", sel("|**x**|")).value).toBe("***x***");
  });

  it("handles inline code and strikethrough", () => {
    expect(show(applyMarkdown("code", sel("|npm run dev|")))).toBe("`|npm run dev|`");
    expect(show(applyMarkdown("strikethrough", sel("|gone|")))).toBe("~~|gone|~~");
  });
});

describe("applyMarkdown — line prefixes", () => {
  it("prefixes the whole line even from a mid-line cursor", () => {
    expect(show(applyMarkdown("h2", sel("My hea|d|ing")))).toBe("|## My heading|");
  });

  it("prefixes every line of a multi-line selection", () => {
    expect(applyMarkdown("ul", sel("|one\ntwo\nthree|")).value).toBe("- one\n- two\n- three");
  });

  it("toggles off only when every line already has the prefix", () => {
    expect(applyMarkdown("ul", sel("|- one\n- two|")).value).toBe("one\ntwo");
    // One line unprefixed — add rather than remove.
    expect(applyMarkdown("ul", sel("|- one\ntwo|")).value).toBe("- - one\n- two");
  });

  it("leaves other lines untouched", () => {
    expect(applyMarkdown("quote", sel("intro\n|middle|\noutro")).value).toBe(
      "intro\n> middle\noutro",
    );
  });

  it("numbers an ordered list and strips the numbers again", () => {
    expect(applyMarkdown("ol", sel("|one\ntwo|")).value).toBe("1. one\n2. two");
    expect(applyMarkdown("ol", sel("|1. one\n2. two|")).value).toBe("one\ntwo");
  });
});

describe("applyMarkdown — link", () => {
  it("uses the selection as the label and selects the url placeholder", () => {
    expect(show(applyMarkdown("link", sel("see |my post| here")))).toBe(
      "see [my post](|url|) here",
    );
  });

  it("falls back to placeholder text with an empty selection", () => {
    expect(applyMarkdown("link", sel("||")).value).toBe("[link text](url)");
  });
});

describe("applyMarkdown — code block", () => {
  it("fences the selection and selects the body", () => {
    expect(show(applyMarkdown("codeblock", sel("|const a = 1|")))).toBe("```\n|const a = 1|\n```");
  });

  it("adds surrounding newlines so the fence is not left inline", () => {
    // A fence that does not start its own line is rendered as literal text.
    expect(applyMarkdown("codeblock", sel("text |x| more")).value).toBe(
      "text \n```\nx\n```\n more",
    );
  });
});

describe("applyMarkdown — checklist", () => {
  it("turns lines into unchecked task items", () => {
    expect(applyMarkdown("tasklist", sel("|Buy milk\nCall bank|")).value).toBe(
      "- [ ] Buy milk\n- [ ] Call bank",
    );
  });

  it("promotes an existing bullet instead of stacking a second marker", () => {
    expect(applyMarkdown("tasklist", sel("|- Buy milk|")).value).toBe("- [ ] Buy milk");
  });

  it("toggles off items that were already ticked", () => {
    // "- [x] " must count as a task marker too, or a list you had ticked
    // through could never be turned back into plain text.
    expect(applyMarkdown("tasklist", sel("|- [x] Done\n- [ ] Todo|")).value).toBe("Done\nTodo");
  });

  it("adds rather than removes when only some lines are tasks", () => {
    expect(applyMarkdown("tasklist", sel("|- [ ] Done\nPlain|")).value).toBe(
      "- [ ] Done\n- [ ] Plain",
    );
  });

  it("keeps indentation but drops the marker entirely when toggling off", () => {
    // Same contract as the bullet toggle: off means plain text, not a bullet.
    expect(applyMarkdown("tasklist", sel("|  - [ ] Nested|")).value).toBe("  Nested");
  });
});

describe("applyMarkdown — indent and outdent", () => {
  it("indents every selected line by one level", () => {
    expect(applyMarkdown("indent", sel("|- one\n- two|")).value).toBe("  - one\n  - two");
  });

  it("outdents by one level", () => {
    expect(applyMarkdown("outdent", sel("|  - one\n  - two|")).value).toBe("- one\n- two");
  });

  it("clears a partial indent back to the margin", () => {
    // One stray space is less than a level, so it is removed outright rather
    // than left behind as a half-indent.
    expect(applyMarkdown("outdent", sel("| - one|")).value).toBe("- one");
  });

  it("is a no-op at the left margin", () => {
    expect(applyMarkdown("outdent", sel("|- one|")).value).toBe("- one");
  });
});

describe("isOnListLine", () => {
  it("recognises the list forms Tab should nest", () => {
    for (const line of ["- item", "* item", "+ item", "1. item", "  - nested", "- [ ] task"]) {
      expect(isOnListLine(line, line.length)).toBe(true);
    }
  });

  it("leaves Tab alone everywhere else, so focus can still move", () => {
    for (const line of ["plain text", "## Heading", "", "-nodash", "1.no space"]) {
      expect(isOnListLine(line, line.length)).toBe(false);
    }
  });

  it("looks at the caret's own line in a multi-line document", () => {
    const doc = "intro\n- item\noutro";
    expect(isOnListLine(doc, 8)).toBe(true); // inside "- item"
    expect(isOnListLine(doc, 2)).toBe(false); // inside "intro"
  });
});

describe("applyMarkdown — blank lines are separators, not items", () => {
  /*
   * The reported bug. Bulleting several paragraphs prefixed the blank lines
   * between them too, producing an empty "- " that renders as a bullet with
   * nothing after it — a lone dot sitting above each paragraph.
   */
  const PARAS = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
  const all = (v: string) => sel(`|${v}|`);

  it("does not bullet the blank lines between paragraphs", () => {
    const out = applyMarkdown("ul", all(PARAS)).value;

    expect(out).toBe("- First paragraph.\n\n- Second paragraph.\n\n- Third paragraph.");
    expect(out).not.toMatch(/^- $/m);
  });

  it("numbers only the paragraphs, so the sequence does not skip", () => {
    const out = applyMarkdown("ol", all(PARAS)).value;

    expect(out).toBe("1. First paragraph.\n\n2. Second paragraph.\n\n3. Third paragraph.");
  });

  it("does the same for checklists", () => {
    const out = applyMarkdown("tasklist", all(PARAS)).value;

    expect(out).toBe("- [ ] First paragraph.\n\n- [ ] Second paragraph.\n\n- [ ] Third paragraph.");
  });

  it("leaves whitespace-only lines exactly as they were", () => {
    const out = applyMarkdown("ul", all("One\n   \nTwo")).value;

    expect(out).toBe("- One\n   \n- Two");
  });

  it("still toggles off across blank lines", () => {
    const bulleted = "- One\n\n- Two";

    expect(applyMarkdown("ul", all(bulleted)).value).toBe("One\n\nTwo");
  });

  it("toggles quotes and headings the same way", () => {
    expect(applyMarkdown("quote", all("One\n\nTwo")).value).toBe("> One\n\n> Two");
    expect(applyMarkdown("h2", all("One\n\nTwo")).value).toBe("## One\n\n## Two");
  });
});
