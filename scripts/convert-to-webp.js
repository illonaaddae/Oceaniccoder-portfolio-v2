#!/usr/bin/env node
const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const IMAGE_EXTS = [".jpg", ".jpeg", ".JPG", ".JPEG"];
const QUALITY = 80;

async function walk(dir) {
  let results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of list) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await walk(full));
    } else {
      const ext = path.extname(entry.name);
      if (IMAGE_EXTS.includes(ext)) results.push(full);
    }
  }
  return results;
}

async function convert(file) {
  const out = file.replace(/\.[^.]+$/, ".webp");
  try {
    // skip conversion if webp exists and is newer than source
    const [srcStat, outStat] = await Promise.all([
      fs.stat(file),
      fs.stat(out).catch(() => null),
    ]);
    if (outStat && outStat.mtimeMs >= srcStat.mtimeMs) {
      console.log("skip (up-to-date):", file);
      return { file, converted: false };
    }
  } catch (err) {
    // continue if stat failed
  }

  try {
    await sharp(file).webp({ quality: QUALITY }).toFile(out);
    console.log("converted:", file, "->", out);
    return { file, converted: true };
  } catch (err) {
    console.error("failed:", file, err.message);
    return { file, converted: false, error: err };
  }
}

async function main() {
  console.log("Scanning for JPEG files under", ROOT);
  const jpgs = await walk(ROOT);
  console.log("Found", jpgs.length, "JPEG files to consider");
  let convertedCount = 0;
  for (const f of jpgs) {
    const r = await convert(f);
    if (r.converted) convertedCount++;
  }
  console.log(`Done. Converted ${convertedCount}/${jpgs.length} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
