// Loads a Phase 1 backup (scripts/backup-appwrite.mjs) into Cosmos DB.
//
// Creates the `portfolio` database and its containers if missing (layout in
// api/shared/cosmos.js), then writes the backup rows by id, so re-running it
// before cutover just refreshes the data. The rules (scripts/lib/import-plan.mjs):
//   - payments, invoices, quotes and locks are only ever created: a row
//     already in Cosmos is kept, and nothing is pruned from them.
//   - Elsewhere a row is overwritten unless Cosmos has it with a newer
//     updatedAt (a live edit). --force-overwrite overwrites those too.
//   - --insert-only creates missing rows and overwrites nothing.
//   - Rows in Cosmos but not in the backup are reported. --prune deletes them,
//     but only with --pre-cutover, never from the create-only containers or
//     the ones /api/submit writes, and never once the cutover marker exists.
//
// Refuses to import a row that still links to Appwrite Storage: that backup
// was taken before scripts/rewrite-media-urls.mjs ran, so take a new one.
//
// Usage (all need COSMOS_ENDPOINT and COSMOS_KEY):
//   node scripts/import-to-cosmos.mjs --dry-run        read-only: what would change
//   node scripts/import-to-cosmos.mjs                  import every container
//   node scripts/import-to-cosmos.mjs --prune --pre-cutover
//   node scripts/import-to-cosmos.mjs --insert-only --only bookings,messages
//   node scripts/import-to-cosmos.mjs --mark-cutover   record the cutover (alone)
//
// --backup <dir>            backup folder (default: the newest backup/<date>)
// --only a,b                only these containers; an unknown name fails
// --force-overwrite         also overwrite rows that are newer in Cosmos
// --backfill-quote-locks    create the missing quoteNumber lock rows

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import {
  CUTOVER_MARKER_ID,
  afterPlan,
  IMPORTED_CONTAINERS,
  UsageError,
  cutoverMarker,
  dataChecks,
  parseArgs,
  planContainer,
  quoteNumberLock,
  refusalAfterCutover,
} from "./lib/import-plan.mjs";

const require = createRequire(import.meta.url);
const {
  CONTAINERS,
  DATABASE_ID,
  MIGRATED_SETTINGS_KEYS,
  createClient,
  ensureSchema,
  toCosmos,
} = require("../api/shared/cosmos.js");

const APPWRITE_FILE_URL = /appwrite\.io\/v1\/storage\//i;

async function resolveBackupDir(explicit) {
  if (explicit) {
    const dir = path.resolve(explicit);
    if (!existsSync(dir)) throw new Error(`backup folder not found: ${dir}`);
    return dir;
  }
  if (!existsSync("backup")) throw new Error("no backup/ folder here; pass --backup <dir>");
  const dates = (await readdir("backup")).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (dates.length === 0) throw new Error("no backup/<date> folder");
  return path.resolve("backup", dates[dates.length - 1]);
}

const isCode = (err, code) => Boolean(err) && err.code === code;

/** Every row a query returns; an empty list for a missing container on a dry run. */
async function queryAll(container, query, { missingIsEmpty }) {
  try {
    const { resources } = await container.items.query(query).fetchAll();
    return resources;
  } catch (err) {
    if (missingIsEmpty && isCode(err, 404)) return [];
    throw err;
  }
}

async function readMarker(db) {
  const item = db.container("settings").item(CUTOVER_MARKER_ID, CUTOVER_MARKER_ID);
  try {
    const { resource } = await item.read();
    return resource ?? null;
  } catch (err) {
    if (isCode(err, 404)) return null;
    throw err;
  }
}

async function markCutover() {
  const container = createClient().database(DATABASE_ID).container("settings");
  const marker = cutoverMarker(new Date().toISOString());
  try {
    await container.items.create(marker);
    console.log(
      `Cutover marked at ${marker.at}. --prune and --pre-cutover are refused from now on.`,
    );
  } catch (err) {
    if (!isCode(err, 409)) throw err;
    const { resource } = await container.item(CUTOVER_MARKER_ID, CUTOVER_MARKER_ID).read();
    console.log(`Cutover was already marked at ${resource?.at} by ${resource?.by}.`);
  }
}

async function loadBackup(backupDir, containers) {
  const docsByContainer = {};
  const stale = [];
  for (const id of containers) {
    // expenses may have no Appwrite table, so no backup file. Skip it rather
    // than import it as empty. Any other missing file means a broken backup.
    const file = path.join(backupDir, "db", `${id}.json`);
    if (!existsSync(file)) {
      if (id === "expenses") {
        console.log(`  ${id}: no backup file, skipped`);
        continue;
      }
      throw new Error(`backup file missing: ${file}`);
    }
    const rows = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(rows)) throw new Error(`${file} does not hold a list of rows`);
    const kept = id === "settings" ? rows.filter((r) => MIGRATED_SETTINGS_KEYS.has(r.key)) : rows;
    for (const row of kept) {
      if (APPWRITE_FILE_URL.test(JSON.stringify(row))) stale.push(`${id}/${row.$id}`);
    }
    docsByContainer[id] = kept.map(toCosmos);
  }
  return { docsByContainer, stale };
}

function describePlan(id, plan, dryRun) {
  const parts = [
    `create ${plan.create.length}`,
    `overwrite ${plan.overwrite.length}`,
    plan.skipExisting.length && `${plan.skipExisting.length} existing kept`,
    plan.skipNewer.length && `${plan.skipNewer.length} newer in Cosmos skipped`,
    plan.forcedNewer.length && `${plan.forcedNewer.length} newer in Cosmos FORCED`,
    plan.prune.length && `${dryRun ? "would prune" : "pruned"} ${plan.prune.length}`,
    plan.kept.length && `${plan.kept.length} not in backup, kept`,
  ].filter(Boolean);
  return `  ${id.padEnd(22)} [${plan.mode}] ${parts.join(", ")}`;
}

async function applyPlan(container, plan) {
  let raced = 0;
  // Sequential on purpose: ~200 small documents, and the free tier's
  // 1,000 RU/s is shared by every container. The SDK retries 429s itself.
  for (const doc of plan.create) {
    try {
      await container.items.create(doc);
    } catch (err) {
      // Written by a live function since the plan was made: keep that row.
      if (!isCode(err, 409)) throw err;
      raced += 1;
    }
  }
  for (const doc of plan.overwrite) await container.items.upsert(doc);
  for (const row of plan.prune) await container.item(row.id, row.pk).delete();
  return raced;
}

function printChecks(checks, label) {
  console.log(`\nData checks (${label}):`);
  let problems = 0;
  const report = (title, list, line) => {
    if (list.length === 0) return;
    problems += list.length;
    console.log(`  ${title}: ${list.length}`);
    for (const item of list) console.log(`    ${line(item)}`);
  };
  report(
    "duplicate invoiceNumber",
    checks.duplicateInvoiceNumbers,
    (d) => `${d.invoiceNumber}: ${d.ids.join(", ")}`,
  );
  report(
    "invoices with a bad number, total or currency",
    checks.badInvoices,
    (b) => `${b.id}: ${b.problems.join(", ")}`,
  );
  if (checks.paymentProblems === null) {
    console.log("  payments ids: not checked (payments not in this run)");
  } else {
    report(
      "payments not preserved from Appwrite",
      checks.paymentProblems,
      (p) => `${p.id}: ${p.problem}`,
    );
  }
  report(
    "quotes without a quoteNumber lock",
    checks.quotesWithoutLock,
    (q) => `${q.id}: ${q.quoteNumber ?? "no quoteNumber"}`,
  );
  if (problems === 0) console.log("  no problems found");
}

async function backfillQuoteLocks(db, quotesWithoutLock, dryRun) {
  const numbered = quotesWithoutLock.filter((q) => q.quoteNumber);
  if (dryRun) {
    console.log(`\n${numbered.length} quoteNumber lock(s) would be created (dry run).`);
    return;
  }
  const locks = db.container("locks");
  const now = new Date().toISOString();
  let created = 0;
  for (const { quoteNumber } of numbered) {
    try {
      await locks.items.create(quoteNumberLock(quoteNumber, now));
      created += 1;
    } catch (err) {
      if (!isCode(err, 409)) throw err;
    }
  }
  console.log(`\n${created} quoteNumber lock(s) created.`);
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.markCutover) {
    await markCutover();
    return 0;
  }

  const backupDir = await resolveBackupDir(flags.backup);
  console.log(`Backup: ${backupDir}\n`);

  // Read and check everything before touching Cosmos.
  const { docsByContainer, stale } = await loadBackup(backupDir, flags.only ?? IMPORTED_CONTAINERS);
  if (stale.length > 0) {
    console.error(`${stale.length} row(s) still link to Appwrite Storage:`);
    for (const ref of stale) console.error(`  ${ref}`);
    console.error("\nThis backup predates the URL rewrite. Run scripts/backup-appwrite.mjs again.");
    return 1;
  }

  const client = createClient();
  const marker = await readMarker(client.database(DATABASE_ID));
  const refusal = refusalAfterCutover(flags, marker);
  if (refusal) {
    console.error(refusal);
    return 1;
  }
  // A dry run must not create anything, so it skips ensureSchema and reads a
  // missing container as empty.
  const db = flags.dryRun ? client.database(DATABASE_ID) : await ensureSchema(client);
  const readOpts = { missingIsEmpty: flags.dryRun };
  if (marker) console.log(`Cutover marked at ${marker.at}: Cosmos is live.\n`);
  if (flags.forceOverwrite) {
    console.warn("WARNING: --force-overwrite replaces rows edited in Cosmos after the backup.\n");
  }

  let failed = false;
  const plans = {};
  for (const [id, docs] of Object.entries(docsByContainer)) {
    const container = db.container(id);
    const pk = CONTAINERS[id].partitionKey.slice(1);
    const existing = await queryAll(
      container,
      `SELECT c.id, c.${pk} AS pk, c.updatedAt FROM c`,
      readOpts,
    );
    const plan = planContainer(id, docs, existing, flags);
    plans[id] = plan;
    console.log(describePlan(id, plan, flags.dryRun));
    for (const doc of plan.forcedNewer) console.warn(`    forced over newer Cosmos row ${doc.id}`);
    if (flags.dryRun) continue;

    const raced = await applyPlan(container, plan);
    if (raced) console.log(`    ${raced} created by a live function meanwhile, kept`);

    const rows = await queryAll(container, "SELECT c.id FROM c", readOpts);
    const found = new Set(rows.map((r) => r.id));
    const missing = docs.filter((d) => !found.has(d.id));
    if (missing.length) {
      failed = true;
      console.log(`    MISSING ${missing.length} of ${docs.length} backup rows`);
    }
  }

  // A dry run checks the rows Cosmos would hold once this import ran.
  const all = async (id) => {
    const rows = await queryAll(db.container(id), "SELECT * FROM c", readOpts);
    return flags.dryRun && plans[id] ? afterPlan(rows, plans[id]) : rows;
  };
  const checks = dataChecks({
    invoices: await all("invoices"),
    payments: await all("payments"),
    quotes: await all("quotes"),
    locks: await all("locks"),
    backupPayments: docsByContainer.payments ?? null,
  });
  printChecks(checks, flags.dryRun ? "Cosmos after this import, dry run" : "Cosmos");
  if (flags.backfillQuoteLocks) {
    await backfillQuoteLocks(db, checks.quotesWithoutLock, flags.dryRun);
  }

  if (flags.dryRun) {
    console.log("\nDry run: nothing written.");
    return 0;
  }
  console.log(
    failed
      ? "\nSome backup rows are missing from Cosmos."
      : "\nImport complete; every backup row is in Cosmos.",
  );
  return failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    if (err instanceof UsageError) {
      console.error(`${err.message}\nUsage notes are at the top of scripts/import-to-cosmos.mjs.`);
      process.exit(2);
    }
    console.error(`Import failed: ${err && err.stack ? err.stack : err}`);
    console.error(
      "Cosmos may be part-written. Fix the cause and run it again; re-running is safe.",
    );
    process.exit(1);
  },
);
