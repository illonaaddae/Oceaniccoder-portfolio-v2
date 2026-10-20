// Loads a Phase 1 backup (scripts/backup-appwrite.mjs) into Cosmos DB.
//
// Creates the `portfolio` database and its containers if missing (layout in
// api/shared/cosmos.js), then writes the backup rows by id, so re-running it
// before cutover just refreshes the data. The rules (scripts/lib/import-plan.mjs):
//   - Without --pre-cutover, payments, invoices, quotes and locks are only
//     ever created: a row already in Cosmos is kept.
//   - Elsewhere, and in those four with --pre-cutover, a row is overwritten
//     unless Cosmos has it with a newer updatedAt (a live edit).
//     --force-overwrite overwrites those too.
//   - --insert-only creates missing rows and overwrites nothing.
//   - Rows in Cosmos but not in the backup are reported. --prune deletes them,
//     but only with --pre-cutover, never from the ones /api/submit writes, from
//     payments and invoices only with --prune-money as well, and never once the
//     cutover marker exists.
//   - After the marker only --insert-only runs, unless
//     --allow-overwrite-after-cutover is given, and never into quotes or
//     locks unless --allow-quote-state-after-cutover is given. --dry-run is
//     always allowed (but not with --prune or --pre-cutover).
//   - Before the marker, a real run fails if any invoice, quote or payment in
//     the backup differs from Cosmos in status or updatedAt.
//
// Refuses to import a row that still links to Appwrite Storage: that backup
// was taken before scripts/rewrite-media-urls.mjs ran, so take a new one.
//
// Usage. Every run needs COSMOS_ENDPOINT and COSMOS_KEY; keep them in env
// files (chmod 600, git-ignored) rather than on the command line: the
// read-only key in .env.cutover for --dry-run, the primary key in
// .env.cutover.write for runs that write.
//   node --env-file=.env.cutover scripts/import-to-cosmos.mjs --dry-run --pre-cutover
//   node --env-file=.env.cutover.write scripts/import-to-cosmos.mjs --pre-cutover
//   node --env-file=.env.cutover.write scripts/import-to-cosmos.mjs --prune --pre-cutover
//   node --env-file=.env.cutover.write scripts/import-to-cosmos.mjs --insert-only --only bookings
//   node --env-file=.env.cutover.write scripts/import-to-cosmos.mjs --mark-cutover   (alone)
//
// --backup <dir>            backup folder (default: the newest backup/<date>;
//                           a backup/<date>-final folder must be named)
// --only a,b                only these containers; an unknown name fails
// --created-after <time>    only backup rows created after this time (Z or an
//                           offset), e.g. the final backup's takenAt. Needs
//                           --insert-only.
// --force-overwrite         also overwrite rows that are newer in Cosmos
// --prune-money             with --prune, also prune payments and invoices
// --allow-overwrite-after-cutover
//                           after the marker, run without --insert-only anyway
// --allow-quote-state-after-cutover
//                           after the marker, import into quotes and locks,
//                           or run --backfill-quote-locks
// --backfill-quote-locks    create the missing quoteNumber lock rows

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { applyPlan, isCode, isMissingContainer } from "./lib/apply-plan.mjs";
import {
  CUTOVER_MARKER_CONTAINER,
  CUTOVER_MARKER_ID,
  DRIFT_CHECKED,
  afterPlan,
  IMPORTED_CONTAINERS,
  UsageError,
  cutoverMarker,
  dataChecks,
  parseArgs,
  parseBackupRows,
  planContainer,
  refusalAfterCutover,
  backfillLockRows,
  driftAdvice,
  refuseMarkerInBackup,
  rowsCreatedAfter,
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

/** Every row a query returns; an empty list for a missing container on a dry run. */
async function queryAll(container, query, { missingIsEmpty }) {
  try {
    const { resources } = await container.items.query(query).fetchAll();
    return resources;
  } catch (err) {
    if (missingIsEmpty && isMissingContainer(err)) return [];
    throw err;
  }
}

async function readMarker(db) {
  const item = db.container(CUTOVER_MARKER_CONTAINER).item(CUTOVER_MARKER_ID, CUTOVER_MARKER_ID);
  try {
    const { resource } = await item.read();
    return resource ?? null;
  } catch (err) {
    // No locks container yet means no marker either.
    if (isCode(err, 404) || isMissingContainer(err)) return null;
    throw err;
  }
}

async function markCutover() {
  // Only the marker's container is made if missing (locks has no unique keys
  // or TTL, so this matches ensureSchema). A missing database still fails:
  // marking a cutover that never imported anything is a mistake.
  const db = createClient().database(DATABASE_ID);
  const { container } = await db.containers.createIfNotExists({
    id: CUTOVER_MARKER_CONTAINER,
    partitionKey: { paths: [CONTAINERS[CUTOVER_MARKER_CONTAINER].partitionKey] },
  });
  const marker = cutoverMarker(new Date().toISOString());
  try {
    await container.items.create(marker);
    console.log(`Cutover marked at ${marker.at}. From now on only --insert-only imports run.`);
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
    const rows = parseBackupRows(file, await readFile(file, "utf8"));
    const kept = id === "settings" ? rows.filter((r) => MIGRATED_SETTINGS_KEYS.has(r.key)) : rows;
    for (const row of kept) {
      if (APPWRITE_FILE_URL.test(JSON.stringify(row))) stale.push(`${id}/${row.$id}`);
    }
    docsByContainer[id] = kept.map(toCosmos);
    refuseMarkerInBackup(id, docsByContainer[id]);
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
  report(
    "invoices, quotes and payments that differ from the backup",
    checks.stateDrift,
    (d) => `${d.container}/${d.id}: ${d.problem}`,
  );
  if (problems === 0) console.log("  no problems found");
}

async function backfillQuoteLocks(db, lockRows) {
  const locks = db.container("locks");
  let created = 0;
  for (const lock of lockRows) {
    try {
      await locks.items.create(lock);
      created += 1;
    } catch (err) {
      if (!isCode(err, 409)) throw err;
    }
  }
  return created;
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
  if (flags.createdAfter) {
    console.log(`Only rows created after ${flags.createdAfter}:`);
    for (const [id, docs] of Object.entries(docsByContainer)) {
      const { kept, unreadable } = rowsCreatedAfter(docs, flags.createdAfter);
      docsByContainer[id] = kept;
      console.log(`  ${id}: ${kept.length} of ${docs.length}`);
      for (const doc of unreadable) console.log(`    ${doc.id}: no readable createdAt, left out`);
    }
    console.log("");
  }
  if (stale.length > 0) {
    console.error(`${stale.length} row(s) still link to Appwrite Storage:`);
    for (const ref of stale) console.error(`  ${ref}`);
    console.error("\nThis backup predates the URL rewrite. Run scripts/backup-appwrite.mjs again.");
    return 1;
  }

  const client = createClient();
  const marker = await readMarker(client.database(DATABASE_ID));
  const refusal = refusalAfterCutover(flags, marker, Object.keys(docsByContainer));
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

    const { raced, clashes } = await applyPlan(id, container, plan);
    if (raced) console.log(`    ${raced} created by a live function meanwhile, kept`);
    if (clashes.length > 0) failed = true;
    for (const clash of clashes) {
      const reason = clash.missingFields
        ? `it has no ${clash.missingFields.join(", ")}`
        : clash.holders.length > 0
          ? `Cosmos row ${clash.holders.join(", ")} holds its key`
          : "Cosmos answered 409 but no row holding its key was found";
      console.log(
        `    unique-key clash: backup row ${clash.id} not ${clash.write === "create" ? "created" : "overwritten"}; ${reason}`,
      );
    }

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
  const checkInput = {
    invoices: await all("invoices"),
    payments: await all("payments"),
    quotes: await all("quotes"),
    locks: await all("locks"),
    backupPayments: docsByContainer.payments ?? null,
    backupState: Object.fromEntries(DRIFT_CHECKED.map((id) => [id, docsByContainer[id] ?? null])),
  };
  let checks = dataChecks(checkInput);
  // Backfill before printing, so the lock check shows what is left after it.
  // A 409 means the lock exists already, so every row counts as present.
  if (flags.backfillQuoteLocks) {
    const lockRows = backfillLockRows(checks.quotesWithoutLock, new Date().toISOString());
    if (flags.dryRun) {
      console.log(`\n${lockRows.length} quoteNumber lock(s) would be created (dry run).`);
    } else {
      const created = await backfillQuoteLocks(db, lockRows);
      console.log(`\n${created} quoteNumber lock(s) created.`);
    }
    checks = dataChecks({ ...checkInput, locks: [...checkInput.locks, ...lockRows] });
  }
  printChecks(checks, flags.dryRun ? "Cosmos after this import, dry run" : "Cosmos");

  if (flags.dryRun) {
    console.log("\nDry run: nothing written.");
    return 0;
  }
  // After the marker Cosmos is live, so it is expected to move on from the backup.
  const drifted = checks.stateDrift.length > 0 && !marker;
  if (failed)
    console.log("\nSome backup rows were not written (missing or a unique-key clash, above).");
  if (drifted) {
    console.log(
      `\nSome invoices, quotes or payments differ from the backup. ${driftAdvice(flags)}`,
    );
  }
  if (!failed && !drifted) console.log("\nImport complete; every backup row is in Cosmos.");
  return failed || drifted ? 1 : 0;
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
