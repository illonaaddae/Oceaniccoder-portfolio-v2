import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./MarkdownRenderer";

afterEach(cleanup);

const renderMd = (md: string) => render(<MarkdownRenderer content={md} isDark={false} />);

describe("link rendering", () => {
  it("recovers the target when the URL was pasted into the text slot", () => {
    /*
     * The reported bug, exactly as it sits in the published posts: the toolbar
     * writes `[link text](url)`, the URL went over the *text*, and `url` stayed
     * in the href. Browsers read that as a same-site path, so the click left
     * the post and the SPA router answered "Page not found".
     */
    const { container } = renderMd("[https://news.ycombinator.com/item?id=1](url)");

    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("https://news.ycombinator.com/item?id=1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("gives a bare domain its scheme so it is not treated as a route", () => {
    const { container } = renderMd("[Example](example.com/blog)");

    expect(container.querySelector("a")!.getAttribute("href")).toBe("https://example.com/blog");
  });

  it("renders plain text, not a dead link, when no URL can be found", () => {
    const { container } = renderMd("[Read the docs](url)");

    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("Read the docs")).toBeTruthy();
  });

  it("keeps internal routes internal — no new tab, no icon", () => {
    const { container } = renderMd("[All posts](/blog)");

    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/blog");
    expect(link.getAttribute("target")).toBeNull();
    expect(link.querySelector("svg")).toBeNull();
  });

  it("marks an external link with an icon", () => {
    const { container } = renderMd("[Announcement](https://example.com/post)");

    const link = container.querySelector("a")!;
    expect(link.querySelector("svg")).toBeTruthy();
    expect(link.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("shortens a label that is itself a raw URL", () => {
    const { container } = renderMd("[https://www.example.com/blog/](url)");

    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("https://www.example.com/blog/");
    expect(link.textContent).toContain("example.com/blog");
    expect(link.textContent).not.toContain("https://");
  });

  it("leaves a normal label untouched", () => {
    const { container } = renderMd("[The announcement](https://example.com)");

    expect(container.querySelector("a")!.textContent).toContain("The announcement");
  });

  it("keeps formatting inside a link intact", () => {
    const { container } = renderMd("[**bold** link](https://example.com)");

    expect(container.querySelector("a strong")).toBeTruthy();
  });

  it("links a bare URL typed on its own", () => {
    const { container } = renderMd("Read https://example.com/x for more.");

    expect(container.querySelector("a")!.getAttribute("href")).toBe("https://example.com/x");
  });

  it("does not let a long URL push the post wider than the card", () => {
    const { container } = renderMd(`[https://example.com/${"a".repeat(120)}](url)`);

    expect(container.querySelector("a")!.className).toContain("break-words");
  });
});
