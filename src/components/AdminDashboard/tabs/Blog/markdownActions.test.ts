import { describe, expect, it } from "vitest";
import { applyMarkdown, EditorSelection } from "./markdownActions";

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
