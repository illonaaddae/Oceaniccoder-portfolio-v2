/* global module, require, Buffer */
// Paints the layout's draw operations into a PDF with pdfkit. It makes no
// layout decisions: every position comes from layout.js, measured with the
// same fonts, so what the tests check is what gets drawn.
//
// Text is drawn as real text with a ToUnicode map (pdfkit does this for
// embedded fonts), so it can be selected, copied and read by an ATS.

const PDFDocument = require("pdfkit");
const { layout } = require("./layout");
const { loadFonts, createMeasurer, fontFeatures } = require("./fonts");

// ops -> PDF bytes. meta: { title, author, subject, creationDate }.
function paint(result, fonts, meta = {}) {
  const info = {
    Title: meta.title || "CV",
    Author: meta.author || "",
    Subject: meta.subject || "Curriculum vitae",
    Creator: "oceaniccoder.dev",
    Producer: "oceaniccoder.dev",
  };
  if (meta.creationDate) info.CreationDate = meta.creationDate;

  const doc = new PDFDocument({
    autoFirstPage: false,
    size: [result.page.width, result.page.height],
    margin: 0,
    info,
    lang: "en",
    displayTitle: true,
  });
  doc.registerFont("regular", fonts.regular);
  doc.registerFont("bold", fonts.bold);

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  for (const ops of result.pages) {
    doc.addPage({ size: [result.page.width, result.page.height], margin: 0 });
    for (const op of ops) drawOp(doc, op);
  }
  doc.end();
  return done;
}

function drawOp(doc, op) {
  switch (op.type) {
    case "text":
      doc
        .font(op.weight === "bold" ? "bold" : "regular")
        .fontSize(op.size)
        .fillColor(op.color || "#000000")
        .text(op.text, op.x, op.y, {
          lineBreak: false,
          baseline: "alphabetic",
          features: fontFeatures(),
        });
      return;
    case "rule":
      doc
        .save()
        .lineWidth(op.thickness)
        .strokeColor(op.color || "#000000")
        .moveTo(op.x1, op.y)
        .lineTo(op.x2, op.y)
        .stroke()
        .restore();
      return;
    case "link":
      doc.link(op.x, op.y, op.width, op.height, op.url);
      return;
    default:
      throw new Error(`Unknown CV draw op "${op.type}"`);
  }
}

// CV document -> { pdf, pages, warnings }. fontSource is passed to loadFonts.
async function renderCv(cv, { fontSource, creationDate } = {}) {
  const fonts = await loadFonts(fontSource);
  const result = layout(cv, { measure: createMeasurer(fonts) });
  const header = (cv && cv.header) || {};
  const name = String(header.name || "").trim();
  const pdf = await paint(result, fonts, {
    title: name ? `${name} CV` : "CV",
    author: name,
    subject: String(header.title || "Curriculum vitae").trim(),
    creationDate,
  });
  return { pdf, pages: result.pages.length, warnings: result.warnings };
}

module.exports = { renderCv, paint };
