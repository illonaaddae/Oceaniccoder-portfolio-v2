// @vitest-environment node
/* global Buffer */
import { describe, it, expect } from "vitest";
import zlib from "zlib";

const { renderCv } = await import("./render.js");
const { fixtureCv } = await import("./fixture.js");

// Reads the PDF the way a text extractor does: each font's ToUnicode map
// turns the glyph ids in the page content back into characters. If pdfkit
// stopped writing those maps, ATS parsing would fail and so would this.
function parsePdf(buffer) {
  const source = buffer.toString("latin1");
  const objects = new Map();
  for (const match of source.matchAll(/(?:^|\n)(\d+) 0 obj\n([\s\S]*?)\nendobj/g)) {
    const body = match[2];
    const start = body.indexOf("stream\n");
    let stream = null;
    if (start !== -1) {
      const raw = Buffer.from(body.slice(start + 7, body.lastIndexOf("\nendstream")), "latin1");
      stream = /\/FlateDecode/.test(body.slice(0, start)) ? zlib.inflateSync(raw) : raw;
    }
    objects.set(match[1], { dict: start === -1 ? body : body.slice(0, start), stream });
  }

  const cmaps = new Map();
  for (const [id, object] of objects) {
    const toUnicode = /\/Type \/Font[\s\S]*\/ToUnicode (\d+) 0 R/.exec(object.dict);
    if (toUnicode) cmaps.set(id, parseCmap(objects.get(toUnicode[1]).stream.toString("latin1")));
  }

  const pages = [];
  for (const object of objects.values()) {
    if (!/\/Type \/Page\b/.test(object.dict)) continue;
    const contents = /\/Contents (\d+) 0 R/.exec(object.dict)[1];
    const resources = objects.get(/\/Resources (\d+) 0 R/.exec(object.dict)[1]).dict;
    const fonts = new Map(
      [...resources.matchAll(/\/(F\d+) (\d+) 0 R/g)].map((m) => [m[1], cmaps.get(m[2])]),
    );
    pages.push({
      lines: textLines(objects.get(contents).stream.toString("latin1"), fonts),
      dict: object.dict,
    });
  }
  return { source, pages, cmaps };
}

function parseCmap(text) {
  const map = new Map();
  const utf16 = (hex) => String.fromCharCode(...hex.match(/.{4}/g).map((h) => parseInt(h, 16)));
  for (const range of text.matchAll(/<([0-9a-f]+)> <([0-9a-f]+)> \[([^\]]*)\]/gi)) {
    const first = parseInt(range[1], 16);
    [...range[3].matchAll(/<([0-9a-f ]+)>/gi)].forEach((dst, i) =>
      map.set(first + i, utf16(dst[1].replace(/ /g, ""))),
    );
  }
  return map;
}

function textLines(content, fonts) {
  const lines = [];
  let cmap = null;
  for (const op of content.matchAll(/\/(F\d+) [\d.]+ Tf|\[([^\]]*)\] TJ/g)) {
    if (op[1]) {
      cmap = fonts.get(op[1]);
      continue;
    }
    const glyphs = [...op[2].matchAll(/<([0-9a-f]+)>/gi)].flatMap((m) => m[1].match(/.{4}/g));
    lines.push(glyphs.map((g) => cmap.get(parseInt(g, 16))).join(""));
  }
  return lines;
}

describe("renderCv", () => {
  it("produces a PDF with one page per laid-out page and no warnings for the fixture", async () => {
    const { pdf, pages, warnings } = await renderCv(fixtureCv());
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.subarray(-6).toString("latin1")).toContain("%%EOF");
    expect(pages).toBe(2);
    expect(warnings).toEqual([]);
    const parsed = parsePdf(pdf);
    expect(parsed.pages).toHaveLength(2);
    for (const page of parsed.pages) expect(page.dict).toContain("/MediaBox [0 0 612 792]");
  });

  it("writes real, extractable text in reading order", async () => {
    const { pdf } = await renderCv(fixtureCv());
    const [first, second] = parsePdf(pdf).pages.map((page) => page.lines);
    expect(first.slice(0, 3)).toEqual(["AMA MENSAH", "Software Engineer", "Kumasi, Ghana"]);
    expect(first).toContain("WORK EXPERIENCE");
    expect(first).toContain(
      "Writing unit and end-to-end tests and reviewing pull requests from other engineers on the team.",
    );
    expect(second).toContain("Available upon request");
  });

  it("draws one glyph per character, with no ligatures for parsers to trip on", async () => {
    const { pdf } = await renderCv(fixtureCv());
    const { cmaps } = parsePdf(pdf);
    expect(cmaps.size).toBe(2);
    for (const cmap of cmaps.values()) {
      for (const text of cmap.values()) expect(text).toHaveLength(1);
    }
  });

  it("embeds the fonts and adds the header links as URI annotations", async () => {
    const { pdf } = await renderCv(fixtureCv());
    const { source, pages } = parsePdf(pdf);
    expect(source).toContain("/FontFile2");
    expect(source).toMatch(/\/BaseFont \/[A-Z]{6}\+DejaVuSans\b/);
    expect(source).toMatch(/\/BaseFont \/[A-Z]{6}\+DejaVuSans-Bold\b/);
    expect(pages[0].dict).toMatch(/\/Annots \[\d+ 0 R \d+ 0 R \d+ 0 R\]/);
    for (const url of [
      "https://www.linkedin.example/in/ama-mensah",
      "https://github.example/ama-mensah",
      "https://ama-mensah.example.com/",
    ]) {
      expect(source).toContain(`/URI (${url})`);
    }
  });

  it("sets the title, author and subject from the profile", async () => {
    const { pdf } = await renderCv(fixtureCv(), { creationDate: new Date("2026-11-02T00:00:00Z") });
    const source = pdf.toString("latin1");
    expect(source).toContain("(Ama Mensah CV)");
    expect(source).toContain("(Ama Mensah)");
    expect(source).toContain("(Software Engineer)");
    expect(source).toContain("D:20261102000000Z");
    expect(source).toContain("/DisplayDocTitle true");
  });

  it("uses fonts from a custom source, and fails loudly when the source returns none", async () => {
    const { loadFonts } = await import("./fonts.js");
    const bundled = await loadFonts();
    const { pages } = await renderCv(fixtureCv(), {
      fontSource: async () => ({ family: "Test", regular: bundled.regular, bold: bundled.bold }),
    });
    expect(pages).toBe(2);
    await expect(renderCv(fixtureCv(), { fontSource: async () => ({}) })).rejects.toThrow(
      "CV font source must return regular and bold font buffers",
    );
  });
});
