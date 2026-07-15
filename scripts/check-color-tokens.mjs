#!/usr/bin/env node
/**
 * Color-system guard.
 *
 * The portfolio has ONE brand family (oceanic) + neutrals (slate) + a small set
 * of semantic accents (success/warning/error/info) used only for status badges.
 * Decorative rainbow hues (purple, pink, emerald, orange, …) are what made the UI
 * read as generic/AI-scaffolded. This script fails CI if any come back.
 *
 * Run: node scripts/check-color-tokens.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src", import.meta.url));
const EXTS = new Set([".jsx", ".tsx", ".js", ".ts", ".css"]);

// Hues banned as decoration. green/red/amber/yellow are allowed ONLY via the
// semantic tokens (success/warning/error/info), so the raw Tailwind scales for
// those are also banned to force the tokens.
const BANNED = [
  "purple",
  "pink",
  "fuchsia",
  "violet",
  "rose",
  "indigo",
  "emerald",
  "orange",
  "teal", // use oceanic instead
  "cyan", // use oceanic instead
  "sky", // use oceanic instead
];

// Matches Tailwind utility usage like from-purple-500, to-pink-400, bg-emerald-600,
// text-orange-500, border-violet-500, via-rose-500, ring-cyan-500, etc.
const UTILITY_RE = new RegExp(
  `\\b(?:bg|text|from|via|to|border|ring|fill|stroke|shadow|decoration|outline)-(?:${BANNED.join("|")})-\\d{2,3}\\b`,
  "g",
);

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.has(extname(name))) out.push(full);
  }
}

const files = [];
walk(ROOT, files);

const violations = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const matches = line.match(UTILITY_RE);
    if (matches) {
      violations.push({
        file: file.replace(`${ROOT}/`, "src/"),
        line: i + 1,
        hits: [...new Set(matches)],
      });
    }
  });
}

if (violations.length) {
  console.error(`\n✖ Off-brand color utilities found in ${violations.length} location(s).`);
  console.error(
    "  Allowed: oceanic (brand) · slate (neutrals) · success/warning/error/info (status badges only).\n",
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  →  ${v.hits.join(", ")}`);
  }
  console.error(
    `\n  Fix: replace with an oceanic/slate shade, or a semantic token if it's a status.\n`,
  );
  process.exit(1);
}

console.log(`✓ Color-token guard passed — ${files.length} files, no off-brand hues.`);
