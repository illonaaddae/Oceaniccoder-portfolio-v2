/* global process, console */
// Renders a CV JSON file to a PDF with the same code the functions use, for a
// local preview. The JSON has the CvDocument shape described at the top of
// api/shared/cv/layout.js; api/shared/cv/fixture.js is a made-up example.
//
// Usage (after `npm install` in api/):
//   node scripts/render-cv.mjs <cv.json> <out.pdf>
//   node scripts/render-cv.mjs --fixture <out.pdf>
//
// Keep a JSON file with real contact details outside the repo.

import { createRequire } from "module";
import { readFile, writeFile } from "fs/promises";

const require = createRequire(import.meta.url);
const { renderCv } = require("../api/shared/cv/render.js");
const { fixtureCv } = require("../api/shared/cv/fixture.js");

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("Usage: node scripts/render-cv.mjs <cv.json | --fixture> <out.pdf>");
    process.exit(2);
  }
  const cv = input === "--fixture" ? fixtureCv() : JSON.parse(await readFile(input, "utf8"));
  const started = Date.now();
  const { pdf, pages, warnings } = await renderCv(cv);
  await writeFile(output, pdf);
  console.log(`Wrote ${output}: ${pages} page(s), ${pdf.length} bytes, ${Date.now() - started} ms`);
  for (const warning of warnings) console.warn(`warning ${warning.code}: ${warning.message}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
