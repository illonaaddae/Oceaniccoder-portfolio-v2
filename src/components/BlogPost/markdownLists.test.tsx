import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./MarkdownRenderer";

afterEach(cleanup);

const renderMd = (md: string) => render(<MarkdownRenderer content={md} isDark={false} />);

describe("list rendering", () => {
  it("keeps the marker beside the text on a loose list", () => {
    /*
     * The reported bug. Blank lines between items make remark wrap each item's
     * content in a <p> — a block element. With `list-inside` the marker took
     * the first line and the text dropped to the next one, so bulleting a set
     * of existing paragraphs produced a bullet alone above every paragraph.
     *
     * `list-outside` keeps the marker in the gutter, and the paragraph margin
     * is cancelled inside items so loose and tight lists match.
     */
    const { container } = renderMd("- First paragraph.\n\n- Second paragraph.");

    const ul = container.querySelector("ul")!;
    expect(ul.className).toContain("list-outside");
    expect(ul.className).not.toContain("list-inside");
    // The margin killer has to be present or every loose item gains a gap.
    expect(ul.className).toContain("[&_li>p]:mb-0");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders a tight list the same way", () => {
    const { container } = renderMd("- Alpha\n- Beta");

    expect(container.querySelector("ul")!.className).toContain("list-outside");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("steps the marker style through nested levels", () => {
    const { container } = renderMd("- Top\n  - Middle\n    - Deep");

    // Depth has to be readable without counting indentation.
    const ul = container.querySelector("ul")!;
    expect(ul.className).toContain("[&_ul]:list-[circle]");
    expect(ul.className).toContain("[&_ul_ul]:list-[square]");
    expect(container.querySelectorAll("ul")).toHaveLength(3);
  });

  it("numbers nested ordered lists differently from their parent", () => {
    const { container } = renderMd("1. One\n2. Two\n   1. Sub");

    expect(container.querySelector("ol")!.className).toContain("[&_ol]:list-[lower-alpha]");
  });

  it("renders a checklist with styled boxes and no bullets", () => {
    const { container } = renderMd("- [x] Done\n- [ ] Todo");

    const ul = container.querySelector("ul")!;
    expect(ul.className).toContain("list-none");
    // The native disabled checkbox is replaced, so nothing looks clickable.
    expect(container.querySelectorAll("input")).toHaveLength(0);
    expect(container.querySelectorAll("span[aria-hidden]")).toHaveLength(2);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("marks the ticked box and leaves the other empty", () => {
    const { container } = renderMd("- [x] Done\n- [ ] Todo");

    const [checked, unchecked] = [...container.querySelectorAll("span[aria-hidden]")];
    expect(checked.className).toContain("bg-oceanic-500");
    expect(unchecked.className).toContain("bg-transparent");
  });

  it("keeps the box on the same line as its text on a loose checklist", () => {
    /*
     * The reported bug. A blank line between items makes remark wrap the item
     * in a <p> — and it puts the checkbox *inside* that paragraph. The box was
     * styled `flex`, which is block-level, so it claimed a whole line and every
     * item rendered as an empty box above its own text.
     *
     * An inline box stays in the text flow. The hanging indent on the item then
     * lines wrapped text up under the first line rather than under the box.
     */
    const { container } = renderMd("- [ ] First item.\n\n- [ ] Second item.");

    const box = container.querySelector("span[aria-hidden]")!;
    expect(box.className).toContain("inline-flex");
    // Bare `flex` would be display:block and break the line again.
    expect(box.className).not.toMatch(/(^|\s)flex(\s|$)/);
    expect(container.querySelector("li")!.className).toContain("indent-");
  });

  it("lays a tight checklist out the same way as a loose one", () => {
    const { container } = renderMd("- [ ] First item.\n- [ ] Second item.");

    const items = [...container.querySelectorAll("li")];
    expect(items).toHaveLength(2);
    // One layout for both kinds — no flex row that only tight items get.
    items.forEach((li) => expect(li.className).toContain("indent-"));
  });

  it("cancels the item's hanging indent inside the box", () => {
    // text-indent inherits, so without this the tick was dragged out of the
    // box and drawn in the margin beside it.
    const { container } = renderMd("- [x] Done");

    expect(container.querySelector("span[aria-hidden]")!.className).toContain("indent-0");
  });

  it("sizes the checkbox in rem, not em", () => {
    // `text-` and `w-`/`h-` on the same element compound: an em-based box
    // shrank to about two-thirds of its intended size.
    const { container } = renderMd("- [ ] Todo");

    const box = container.querySelector("span[aria-hidden]")!;
    expect(box.className).toContain("w-[1.15rem]");
    // Bare em only — "rem]" must not trip this.
    expect(box.className).not.toMatch(/\[\d*\.?\d+em\]/);
  });
});
