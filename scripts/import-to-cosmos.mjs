// Loads a Phase 1 backup (scripts/backup-appwrite.mjs) into Cosmos DB.
//
// Creates the `portfolio` database and its containers if missing (layout in
// api/shared/cosmos.js), then upserts every row by id, so re-running it before
// cutover just refreshes the data. Rows deleted in Appwrite since the last
// import are reported; --prune deletes them from Cosmos too.
//
// Refuses to import a row that still links to Appwrite Storage: that backup
// was taken before scripts/rewrite-media-urls.mjs ran, so take a new one.
//
// Usage:
//   node scripts/import-to-cosmos.mjs --dry-run
//   COSMOS_ENDPOINT=... COSMOS_KEY=... node scripts/import-to-cosmos.mjs
//   COSMOS_ENDPOINT=... COSMOS_KEY=... node scripts/import-to-cosmos.mjs --prune
//
// --backup <dir> picks a backup folder (default: the newest backup/<date>).

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  CONTAINERS,
  MIGRATED_SETTINGS_KEYS,
  createClient,
  ensureSchema,
  toCosmos,
} = require("../api/shared/cosmos.js");

const args = new Set(process.argv.slice(2));
const flagValue = (name) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const APPWRITE_FILE_URL = /appwrite\.io\/v1\/storage\//i;

async function resolveBackupDir() {
  const explicit = flagValue("--backup");
  if (explicit) return path.resolve(explicit);
  const dates = (await readdir("backup")).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (dates.length === 0) throw new Error("no backup/<date> folder");
  return path.resolve("backup", dates[dates.length - 1]);
}

const backupDir = await resolveBackupDir();
console.log(`Backup: ${backupDir}\n`);

// Read and check everything before touching Cosmos.
const docsByContainer = {};
const stale = [];
for (const id of Object.keys(CONTAINERS)) {
  const rows = JSON.parse(await readFile(path.join(backupDir, "db", `${id}.json`), "utf8"));
  const kept = id === "settings" ? rows.filter((r) => MIGRATED_SETTINGS_KEYS.has(r.key)) : rows;
  for (const row of kept) {
    if (APPWRITE_FILE_URL.test(JSON.stringify(row))) stale.push(`${id}/${row.$id}`);
  }
  docsByContainer[id] = kept.map(toCosmos);
}

if (stale.length > 0) {
  console.error(`${stale.length} row(s) still link to Appwrite Storage:`);
  for (const ref of stale) console.error(`  ${ref}`);
  console.error("\nThis backup predates the URL rewrite. Run scripts/backup-appwrite.mjs again.");
  process.exit(1);
}

if (args.has("--dry-run")) {
  for (const [id, docs] of Object.entries(docsByContainer)) {
    console.log(`  ${id.padEnd(22)} ${docs.length}`);
  }
  const total = Object.values(docsByContainer).reduce((n, d) => n + d.length, 0);
  console.log(`\n${total} document(s) would be upserted (dry run, nothing written).`);
  process.exit(0);
}

const db = await ensureSchema(createClient());
const prune = args.has("--prune");
let failed = false;

for (const [id, docs] of Object.entries(docsByContainer)) {
  const container = db.container(id);
  // Sequential on purpose: ~200 small documents, and the free tier's
  // 1,000 RU/s is shared by every container. The SDK retries 429s itself.
  for (const doc of docs) await container.items.upsert(doc);

  const pk = CONTAINERS[id].partitionKey.slice(1);
  const { resources: existing } = await container.items
    .query(`SELECT c.id, c.${pk} AS pk FROM c`)
    .fetchAll();
  const wanted = new Set(docs.map((d) => d.id));
  const found = new Set(existing.map((e) => e.id));
  const extra = existing.filter((e) => !wanted.has(e.id));
  const missing = docs.filter((d) => !found.has(d.id));
  if (prune) {
    for (const e of extra) await container.item(e.id, e.pk).delete();
  }

  const extraNote = !extra.length
    ? ""
    : prune
      ? `  (${extra.length} pruned)`
      : `  (${extra.length} not in backup; --prune removes)`;
  const missingNote = missing.length ? `  MISSING ${missing.length}` : "";
  if (missing.length) failed = true;
  console.log(
    `  ${id.padEnd(22)} ${String(docs.length - missing.length).padStart(3)}/${docs.length}${extraNote}${missingNote}`,
  );
}

console.log(
  failed ? "\nCounts don't match the backup." : "\nImport complete; counts match the backup.",
);
process.exit(failed ? 1 : 0);
