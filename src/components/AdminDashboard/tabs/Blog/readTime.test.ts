import { describe, expect, it } from "vitest";
import { countWords, estimateReadTime } from "./readTime";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

describe("countWords", () => {
  it("counts prose", () => {
    expect(countWords("One two three four five.")).toBe(5);
  });

  it("ignores the syntax that is never read aloud", () => {
    // Headings, emphasis, bullets and blockquote markers are notation, not
    // words — counting them inflates every estimate.
    expect(countWords("## Heading")).toBe(1);
    expect(countWords("**bold** and *italic*")).toBe(3);
    expect(countWords("- one\n- two")).toBe(2);
    expect(countWords("> quoted words here")).toBe(3);
    expect(countWords("- [ ] a task")).toBe(2);
  });

  it("reads link text but not the URL", () => {
    expect(countWords("See [the docs](https://example.com/some/long/path)")).toBe(3);
  });

  it("does not count fenced code or image URLs as prose", () => {
    expect(countWords("Intro.\n\n```js\nconst a = 1;\nconst b = 2;\n```")).toBe(1);
    expect(countWords("![a picture of something](https://example.com/x.png)")).toBe(0);
  });

  it("handles apostrophes and hyphenated words as single words", () => {
    expect(countWords("It's a well-known problem")).toBe(4);
  });

  it("counts nothing in an empty or whitespace body", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\n  ")).toBe(0);
  });
});

describe("estimateReadTime", () => {
  it("gives an empty label for an empty post", () => {
    // "0 min read" on a blank draft reads as a bug.
    expect(estimateReadTime("")).toMatchObject({ minutes: 0, label: "" });
  });

  it("never rounds a real post down to nothing", () => {
    expect(estimateReadTime("A short sentence.").label).toBe("1 min read");
  });

  it("scales with length", () => {
    expect(estimateReadTime(words(225)).minutes).toBe(1);
    expect(estimateReadTime(words(900)).minutes).toBe(4);
  });

  it("bills code by the line rather than at prose speed", () => {
    // Twenty lines of code is not read as ~4 words; it is studied.
    const prose = words(225);
    const withCode = `${prose}\n\n\`\`\`js\n${Array(30).fill("const x = 1;").join("\n")}\n\`\`\``;

    expect(estimateReadTime(withCode).minutes).toBeGreaterThan(estimateReadTime(prose).minutes);
  });

  it("allows for the pause an image causes", () => {
    const prose = words(225);
    const withImages = `${prose}\n\n${Array(8).fill("![shot](https://e.com/a.png)").join("\n\n")}`;

    expect(estimateReadTime(withImages).minutes).toBeGreaterThan(estimateReadTime(prose).minutes);
  });

  it("reports the word count it used", () => {
    expect(estimateReadTime(words(120)).words).toBe(120);
  });
});
