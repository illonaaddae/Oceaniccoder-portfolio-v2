/* global module, require, __dirname, Buffer */
// Fonts for the CV PDF, and the measurer that lays text out with the same
// metrics the painter draws with.
//
// The reference CV is set in Verdana, which may not be redistributed, and this
// repo is public. So the bundled default is DejaVu Sans (Bitstream Vera
// licence, fonts/LICENSE), shipped unmodified: the licence asks for a rename
// if the files are changed, and pdfkit subsets them into each PDF anyway.
// A licensed font kept outside the repo (design D2: a private Blob) comes in
// through `source`, so the swap needs no change here or in the layout.

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const FONT_DIR = path.join(__dirname, "fonts");
const BUNDLED = {
  family: "DejaVu Sans",
  regular: path.join(FONT_DIR, "DejaVuSans.ttf"),
  bold: path.join(FONT_DIR, "DejaVuSans-Bold.ttf"),
};

// Ligatures off (kerning stays on by default): a "fi" ligature is one glyph,
// and some ATS text extractors drop or mangle it. The measurer and the painter
// both use this. A new object each call, because fontkit writes its default
// features into the object it is given.
function fontFeatures() {
  return { liga: false, clig: false };
}

let bundledCache = null;

function readBundled() {
  if (!bundledCache) {
    bundledCache = {
      family: BUNDLED.family,
      regular: fs.readFileSync(BUNDLED.regular),
      bold: fs.readFileSync(BUNDLED.bold),
    };
  }
  return bundledCache;
}

// source, when given, is async () => { family, regular: Buffer, bold: Buffer }.
// A source that fails or returns something unusable is an error, not a silent
// fall back to DejaVu: a published CV must not change typeface unannounced.
async function loadFonts(source) {
  if (!source) return readBundled();
  const fonts = await source();
  if (!fonts || !Buffer.isBuffer(fonts.regular) || !Buffer.isBuffer(fonts.bold)) {
    throw new Error("CV font source must return regular and bold font buffers");
  }
  return { family: String(fonts.family || "Custom"), regular: fonts.regular, bold: fonts.bold };
}

// measure(text, weight, size) -> width in points, from the real glyph advances
// of the font the painter embeds. A throwaway document holds the fonts; it is
// never ended, so nothing is written.
function createMeasurer(fonts) {
  const doc = new PDFDocument({ autoFirstPage: false });
  doc.registerFont("regular", fonts.regular);
  doc.registerFont("bold", fonts.bold);
  return function measure(text, weight, size) {
    doc.font(weight === "bold" ? "bold" : "regular").fontSize(size);
    return doc.widthOfString(text, { features: fontFeatures() });
  };
}

module.exports = { loadFonts, createMeasurer, fontFeatures };
