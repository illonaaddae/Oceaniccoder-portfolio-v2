import { describe, expect, it } from "vitest";
import { firstUrlIn, isExternalHref, looksLikeUrl, prettyUrlLabel, resolveHref } from "./linkHref";

describe("looksLikeUrl", () => {
  it("accepts absolute http and https URLs", () => {
    expect(looksLikeUrl("https://example.com/a?b=1")).toBe(true);
    expect(looksLikeUrl("http://example.com")).toBe(true);
  });

  it("accepts a bare domain and a www-prefixed one", () => {
    expect(looksLikeUrl("example.com")).toBe(true);
    expect(looksLikeUrl("www.example.com/path")).toBe(true);
  });

  it("accepts mailto and tel", () => {
    expect(looksLikeUrl("mailto:hi@example.com")).toBe(true);
    expect(looksLikeUrl("tel:+233201234567")).toBe(true);
  });

  it("rejects plain words, including the toolbar placeholder", () => {
    expect(looksLikeUrl("url")).toBe(false);
    expect(looksLikeUrl("link text")).toBe(false);
    expect(looksLikeUrl("")).toBe(false);
  });
});

describe("resolveHref", () => {
  it("passes an absolute URL through untouched", () => {
    expect(resolveHref("https://example.com/a", "Example")).toBe("https://example.com/a");
  });

  it("adds https to a bare domain so it stops being a same-site path", () => {
    expect(resolveHref("example.com/blog", "Example")).toBe("https://example.com/blog");
    expect(resolveHref("www.example.com", "Example")).toBe("https://www.example.com");
  });

  it("recovers the URL from the link text when the href is the 'url' placeholder", () => {
    // The published-post bug: the URL was pasted over the text slot and the
    // toolbar's `url` placeholder stayed in the href, so the browser treated it
    // as a same-site path and the SPA answered "Page not found".
    expect(resolveHref("url", "https://news.ycombinator.com/item?id=1")).toBe(
      "https://news.ycombinator.com/item?id=1",
    );
  });

  it("takes the first URL when the text holds several", () => {
    expect(resolveHref("url", "https://a.com/one\nhttps://b.com/two")).toBe("https://a.com/one");
  });

  it("keeps in-page anchors and root-relative routes as they are", () => {
    expect(resolveHref("#section", "Jump")).toBe("#section");
    expect(resolveHref("/blog", "Blog")).toBe("/blog");
  });

  it("returns null when nothing usable is left", () => {
    expect(resolveHref("url", "link text")).toBeNull();
    expect(resolveHref("", "")).toBeNull();
  });
});

describe("isExternalHref", () => {
  it("is true for absolute http(s) URLs and false for internal ones", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("/blog")).toBe(false);
    expect(isExternalHref("#top")).toBe(false);
    expect(isExternalHref("mailto:hi@example.com")).toBe(false);
  });
});

describe("firstUrlIn", () => {
  it("finds a URL embedded in a sentence", () => {
    expect(firstUrlIn("see https://example.com/x now")).toBe("https://example.com/x");
  });

  it("drops trailing punctuation that is prose, not URL", () => {
    expect(firstUrlIn("see https://example.com/x.")).toBe("https://example.com/x");
    expect(firstUrlIn("(https://example.com/x)")).toBe("https://example.com/x");
  });

  it("returns null when there is no URL", () => {
    expect(firstUrlIn("nothing here")).toBeNull();
  });
});

describe("prettyUrlLabel", () => {
  it("strips the scheme, www and a trailing slash from a raw URL label", () => {
    expect(prettyUrlLabel("https://www.example.com/blog/")).toBe("example.com/blog");
  });

  it("shortens a very long path with an ellipsis", () => {
    const label = prettyUrlLabel(`https://example.com/${"a".repeat(80)}`);
    expect(label.length).toBeLessThanOrEqual(60);
    expect(label.endsWith("…")).toBe(true);
  });

  it("leaves text that is not a bare URL alone", () => {
    expect(prettyUrlLabel("Read the announcement")).toBe("Read the announcement");
  });
});
