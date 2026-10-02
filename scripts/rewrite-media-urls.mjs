// Replaces Appwrite Storage URLs with their Azure Blob copies, using the
// blob-map.json written by scripts/migrate-storage-to-blob.mjs.
//
// Two targets:
//
//   --src   links hardcoded in src/ (fallback images, logos, seed data).
//           Edits the files in place; review with `git diff`.
//
//   --db    every string field of every table row, arrays and JSON-in-a-string
//           (settings rows) included. Prints what would change and writes
//           nothing unless --apply is passed. With --from-backup it reads the
//           rows from the backup instead of Appwrite, so the dry run needs no
//           key; --apply always reads the live rows first, so edits made since
//           the backup are kept.
//
// Any Appwrite file URL — /view, /preview with resize params, /download — maps
// to the Blob original; the site picks a resized copy itself
// (utils/imageOptimizer). A file id missing from the map is reported and left
// alone.
//
// Usage:
//   node scripts/rewrite-media-urls.mjs --src
//   node scripts/rewrite-media-urls.mjs --db --from-backup
//   APPWRITE_API_KEY=... node scripts/rewrite-media-urls.mjs --db
//   APPWRITE_API_KEY=... node scripts/rewrite-media-urls.mjs --db --apply
//
// --db needs a key with tables.read and rows.read, plus rows.write for --apply.

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client, TablesDB, Query } from "node-appwrite";

const args = new Set(process.argv.slice(2));
const flagValue = (name) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const APPWRITE_FILE_URL =
  /https?:\/\/[a-z0-9.-]*appwrite\.io\/v1\/storage\/buckets\/[a-z0-9]+\/files\/([a-z0-9]+)\/(?:view|preview|download)(?:\?[^\s"'`)\]},]*)?/gi;

async function resolveBackupDir() {
  const explicit = flagValue("--backup");
  if (explicit) return path.resolve(explicit);
  const dates = (await readdir("backup")).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (dates.length === 0) throw new Error("no backup/<date> folder");
  return path.resolve("backup", dates[dates.length - 1]);
}

const backupDir = await resolveBackupDir();
const map = JSON.parse(await readFile(path.join(backupDir, "blob-map.json"), "utf8"));
const missing = new Set();

/** Returns the string with every mapped Appwrite file URL swapped for its Blob URL. */
function rewrite(value) {
  return value.replace(APPWRITE_FILE_URL, (url, fileId) => {
    if (map[fileId]) return map[fileId].url;
    missing.add(fileId);
    return url;
  });
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) yield full;
  }
}

async function rewriteSrc() {
  let files = 0;
  let urls = 0;
  for await (const file of walk("src")) {
    const before = await readFile(file, "utf8");
    const count = (before.match(APPWRITE_FILE_URL) || []).length;
    if (count === 0) continue;
    const after = rewrite(before);
    if (after !== before) {
      await writeFile(file, after);
      files += 1;
      urls += count;
      console.log(`  ${file}: ${count}`);
    }
  }
  console.log(`\n${urls} URL(s) rewritten in ${files} file(s). Review with git diff.`);
}

/** Changed fields only, so --apply never writes back values it didn't touch. */
function changedFields(row) {
  const changes = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith("$")) continue;
    if (typeof value === "string") {
      const next = rewrite(value);
      if (next !== value) changes[key] = next;
    } else if (Array.isArray(value) && value.some((v) => typeof v === "string")) {
      const next = value.map((v) => (typeof v === "string" ? rewrite(v) : v));
      if (next.some((v, i) => v !== value[i])) changes[key] = next;
    }
  }
  return changes;
}

async function rewriteDb() {
  const apply = args.has("--apply");
  const fromBackup = args.has("--from-backup");
  if (apply && fromBackup) throw new Error("--apply reads live rows; drop --from-backup");

  let tablesDB;
  let databaseId;
  if (!fromBackup) {
    const apiKey = process.env.APPWRITE_API_KEY;
    if (!apiKey) throw new Error("APPWRITE_API_KEY is required (or use --from-backup)");
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
      .setProject(process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883")
      .setKey(apiKey);
    tablesDB = new TablesDB(client);
    databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
  }

  async function listRows(tableId) {
    if (fromBackup) {
      return JSON.parse(await readFile(path.join(backupDir, "db", `${tableId}.json`), "utf8"));
    }
    const rows = [];
    let cursor;
    for (;;) {
      const queries = [Query.limit(100), Query.orderAsc("$id")];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const page = await tablesDB.listRows(databaseId, tableId, queries);
      rows.push(...page.rows);
      if (page.rows.length < 100) return rows;
      cursor = page.rows[page.rows.length - 1].$id;
    }
  }

  const tableIds = fromBackup
    ? (await readdir(path.join(backupDir, "db"))).map((f) => f.replace(/\.json$/, ""))
    : (await tablesDB.listTables(databaseId, [Query.limit(100)])).tables.map((t) => t.$id);

  let rowsChanged = 0;
  let fieldsChanged = 0;
  for (const tableId of tableIds.sort()) {
    for (const row of await listRows(tableId)) {
      const changes = changedFields(row);
      const keys = Object.keys(changes);
      if (keys.length === 0) continue;
      rowsChanged += 1;
      fieldsChanged += keys.length;
      console.log(`  ${tableId}/${row.$id}: ${keys.join(", ")}`);
      if (apply) await tablesDB.updateRow(databaseId, tableId, row.$id, changes);
    }
  }

  console.log(
    `\n${fieldsChanged} field(s) in ${rowsChanged} row(s) ${apply ? "updated" : "would change (dry run, nothing written)"}.`,
  );
}

if (args.has("--src")) await rewriteSrc();
else if (args.has("--db")) await rewriteDb();
else {
  console.error("Pass --src or --db (see the header of this file).");
  process.exit(1);
}

if (missing.size > 0) {
  console.error(`\nNo Blob copy for ${missing.size} file id(s), left unchanged:`);
  for (const id of missing) console.error(`  - ${id}`);
  process.exitCode = 1;
}
