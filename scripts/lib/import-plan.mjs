// What scripts/import-to-cosmos.mjs decides, kept free of Cosmos and file
// access so the rules are unit-tested (import-plan.test.mjs): which flags are
// allowed together, and for each container which backup rows are created,
// overwritten or skipped and which Cosmos rows are pruned.

import { createRequire } from "node:module";
import { parseZonedTime } from "./zoned-time.mjs";

const require = createRequire(import.meta.url);
const { CONTAINERS } = require("../../api/shared/cosmos.js");
const { canDelete } = require("../../api/shared/adminData.js");
const { SCHEMAS } = require("../../api/shared/submissions.js");
const { lockId } = require("../../api/shared/tokens.js");

export class UsageError extends Error {}

/** Containers with an Appwrite table to import (not analytics). */
export const IMPORTED_CONTAINERS = Object.keys(CONTAINERS).filter(
  (id) => CONTAINERS[id].imported !== false,
);

// Money and quote state. Once Cosmos is live, a row already there may have
// been written by the webhook or the quote service, so without --pre-cutover
// these are create-only. Before cutover nothing writes them in Cosmos, so
// --pre-cutover refreshes them like any other container: otherwise an import
// taken days before the night leaves stale invoice status, quote stages,
// pending payments and released `stage:`/`settle:` locks (which block real
// payments in api/shared/quotes/settle.js).
export const CREATE_ONLY_CONTAINERS = new Set(["payments", "invoices", "quotes", "locks"]);

// --prune deletes from these only with --prune-money as well. A deleted money
// record is the one loss this script can't undo from Cosmos, so it takes a
// second, deliberate flag after reading the dry run.
export const MONEY_CONTAINERS = new Set(["payments", "invoices"]);

// Visitors write these through /api/submit, which already writes to Cosmos,
// so Cosmos holds rows Appwrite never had.
export const SUBMITTED_CONTAINERS = new Set(Object.keys(SCHEMAS));

// The row that records the cutover. It lives in `locks` because that
// container is `manage: false`: /api/manage can't list, edit or delete it,
// and no public read touches it. Lock rows use hashed ids (`s_...`), so no
// lock can take this id.
export const CUTOVER_MARKER_CONTAINER = "locks";
export const CUTOVER_MARKER_ID = "cutover";

/**
 * The rows in one backup file. A parse error is rethrown with only the file
 * name: Node's message quotes the JSON around the error, which here is
 * personal data (emails, phone numbers) that would end up in a terminal log.
 */
export function parseBackupRows(file, text) {
  let rows;
  try {
    rows = JSON.parse(text);
  } catch {
    throw new Error(`${file} is not valid JSON (re-run scripts/backup-appwrite.mjs)`);
  }
  if (!Array.isArray(rows)) throw new Error(`${file} does not hold a list of rows`);
  return rows;
}

/**
 * Backup rows created strictly after `since` (--created-after). A row with no
 * readable createdAt can't be shown to be new, so it is left out and listed.
 */
export function rowsCreatedAfter(docs, since) {
  const cutoff = Date.parse(since);
  const kept = [];
  const unreadable = [];
  for (const doc of docs) {
    const created = Date.parse(doc.createdAt);
    if (Number.isNaN(created)) unreadable.push(doc);
    else if (created > cutoff) kept.push(doc);
  }
  return { kept, unreadable };
}

/** Containers --prune may delete from. */
export function canPrune(id, { pruneMoney = false } = {}) {
  if (SUBMITTED_CONTAINERS.has(id)) return false;
  if (MONEY_CONTAINERS.has(id)) return pruneMoney;
  return canDelete(id);
}

// A payments row with the webhook's derived id was written by the Cosmos
// webhook (a test-mode run, say), never by an import, so no prune removes it.
function isCosmosNative(id, row) {
  return id === "payments" && typeof row.id === "string" && row.id.startsWith("pi_");
}

const BOOLEAN_FLAGS = {
  "--dry-run": "dryRun",
  "--insert-only": "insertOnly",
  "--force-overwrite": "forceOverwrite",
  "--prune": "prune",
  "--prune-money": "pruneMoney",
  "--pre-cutover": "preCutover",
  "--mark-cutover": "markCutover",
  "--backfill-quote-locks": "backfillQuoteLocks",
  "--allow-overwrite-after-cutover": "overwriteAfterCutover",
  "--allow-quote-state-after-cutover": "quoteStateAfterCutover",
};
const VALUE_FLAGS = { "--backup": "backup", "--only": "only", "--created-after": "createdAfter" };

/** Command-line arguments → flags. Throws UsageError on anything it can't honour. */
export function parseArgs(argv) {
  const flags = {
    backup: undefined,
    only: null,
    createdAfter: null,
    dryRun: false,
    insertOnly: false,
    forceOverwrite: false,
    prune: false,
    pruneMoney: false,
    preCutover: false,
    markCutover: false,
    backfillQuoteLocks: false,
    overwriteAfterCutover: false,
    quoteStateAfterCutover: false,
  };
  const given = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (Object.hasOwn(BOOLEAN_FLAGS, arg)) {
      flags[BOOLEAN_FLAGS[arg]] = true;
    } else if (Object.hasOwn(VALUE_FLAGS, arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new UsageError(`${arg} needs a value`);
      }
      flags[VALUE_FLAGS[arg]] = value;
      i++;
    } else {
      throw new UsageError(`unknown argument: ${arg}`);
    }
    given.push(arg);
  }

  if (flags.only !== null) flags.only = parseOnly(flags.only);
  if (flags.createdAfter !== null) {
    const createdAfter = parseZonedTime(flags.createdAfter);
    if (!createdAfter) throw new UsageError("--created-after needs a time with Z or an offset");
    flags.createdAfter = createdAfter;
    // The filter runs before planning, so every older row would look absent
    // from the backup: a prune would delete it, an overwrite would skip it.
    if (!flags.insertOnly) throw new UsageError("--created-after needs --insert-only");
  }

  if (flags.markCutover && given.some((arg) => arg !== "--mark-cutover")) {
    throw new UsageError("--mark-cutover runs on its own");
  }
  if (flags.prune && !flags.preCutover) {
    throw new UsageError("--prune needs --pre-cutover: pruning is only safe before cutover");
  }
  if (flags.pruneMoney && !flags.prune) {
    throw new UsageError("--prune-money needs --prune");
  }
  if (flags.prune && flags.insertOnly) {
    throw new UsageError("--prune and --insert-only can't be combined");
  }
  if (flags.overwriteAfterCutover && (flags.preCutover || flags.insertOnly)) {
    throw new UsageError(
      "--allow-overwrite-after-cutover can't be combined with --pre-cutover or --insert-only",
    );
  }
  if (flags.forceOverwrite && flags.insertOnly) {
    throw new UsageError("--force-overwrite and --insert-only can't be combined");
  }
  if (flags.prune && flags.only) {
    const refused = flags.only.filter((id) => !canPrune(id, { pruneMoney: true }));
    if (refused.length > 0) {
      throw new UsageError(`--prune never deletes from ${refused.join(", ")}`);
    }
    const money = flags.only.filter((id) => !canPrune(id, flags));
    if (money.length > 0) {
      throw new UsageError(`--prune deletes from ${money.join(", ")} only with --prune-money`);
    }
  }
  return flags;
}

function parseOnly(value) {
  const names = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) throw new UsageError("--only needs at least one container");
  for (const name of names) {
    if (!Object.hasOwn(CONTAINERS, name)) throw new UsageError(`unknown container: ${name}`);
    if (CONTAINERS[name].imported === false) {
      throw new UsageError(`${name} has no Appwrite table to import`);
    }
  }
  return [...new Set(names)];
}

/** Why this run must stop because the cutover marker exists, or null. */
// After cutover only --insert-only is safe by default: counters and
// reactions change in Cosmos without bumping updatedAt, so the newer-updatedAt
// rule would let an old backup overwrite them. Quotes and locks are refused
// even then: a backup quote or lock that Cosmos dropped since (a released
// stage lock, say) would come back and block a real payment. A dry run writes
// nothing, so only --prune and --pre-cutover stop it.
export const QUOTE_STATE_CONTAINERS = ["quotes", "locks"];

export function refusalAfterCutover(flags, marker, containers) {
  if (!marker) return null;
  const marked = `Cutover was marked at ${marker.at} by ${marker.by}. `;
  if (flags.prune || flags.preCutover) {
    return (
      marked + "--prune and --pre-cutover are refused after cutover: Cosmos is the live database."
    );
  }
  if (flags.dryRun) return null;
  if (!flags.insertOnly && !flags.overwriteAfterCutover) {
    return (
      marked +
      "Only --insert-only runs after cutover. To overwrite live rows anyway, add " +
      "--allow-overwrite-after-cutover."
    );
  }
  // --backfill-quote-locks writes locks too; after cutover the quote service
  // reserves every new number itself, so a backfill is an exception.
  const touched = new Set(containers);
  if (flags.backfillQuoteLocks) touched.add("locks");
  const quoteState = QUOTE_STATE_CONTAINERS.filter((id) => touched.has(id));
  if (quoteState.length > 0 && !flags.quoteStateAfterCutover) {
    return (
      marked +
      `${quoteState.join(" and ")} are live quote state after cutover. Leave them out with ` +
      "--only (and drop --backfill-quote-locks), or add --allow-quote-state-after-cutover."
    );
  }
  return null;
}

/** Throws if a backup `locks` row would take the marker's id. */
export function refuseMarkerInBackup(id, docs) {
  if (id !== CUTOVER_MARKER_CONTAINER) return;
  if (docs.some((doc) => doc.id === CUTOVER_MARKER_ID)) {
    throw new Error(
      `the backup's ${id} table has a row with id "${CUTOVER_MARKER_ID}", the cutover marker's id. Remove it from Appwrite and back up again.`,
    );
  }
}

/** The row --mark-cutover writes. */
export function cutoverMarker(now) {
  return {
    id: CUTOVER_MARKER_ID,
    key: CUTOVER_MARKER_ID,
    at: now,
    by: "import-to-cosmos",
    createdAt: now,
    updatedAt: now,
  };
}

// A Cosmos row with no readable updatedAt counts as newer: without a time to
// compare, overwriting it could lose a live edit.
export function isNewerInCosmos(cosmosUpdatedAt, appwriteUpdatedAt) {
  const cosmos = Date.parse(cosmosUpdatedAt);
  const appwrite = Date.parse(appwriteUpdatedAt);
  if (Number.isNaN(cosmos) || Number.isNaN(appwrite)) return true;
  return cosmos > appwrite;
}

/**
 * What to do with one container.
 *   docs      backup rows, already in Cosmos shape (toCosmos)
 *   existing  Cosmos rows as { id, pk, updatedAt }
 * Returns lists of docs (create, overwrite, skipExisting, skipNewer) and of
 * existing rows (prune, kept). `forcedNewer` is the part of `overwrite` that
 * is newer in Cosmos and only overwritten because of --force-overwrite.
 */
export function planContainer(id, docs, existing, flags) {
  const lockedDown = CREATE_ONLY_CONTAINERS.has(id) && !flags.preCutover;
  const createOnly = lockedDown || flags.insertOnly;
  const byId = new Map(existing.map((row) => [row.id, row]));
  const plan = {
    mode: lockedDown ? "create-only" : flags.insertOnly ? "insert-only" : "upsert",
    create: [],
    overwrite: [],
    forcedNewer: [],
    skipExisting: [],
    skipNewer: [],
    prune: [],
    kept: [],
  };

  for (const doc of docs) {
    const current = byId.get(doc.id);
    if (!current) plan.create.push(doc);
    else if (createOnly) plan.skipExisting.push(doc);
    else if (!isNewerInCosmos(current.updatedAt, doc.updatedAt)) plan.overwrite.push(doc);
    else if (flags.forceOverwrite) {
      plan.overwrite.push(doc);
      plan.forcedNewer.push(doc);
    } else plan.skipNewer.push(doc);
  }

  const wanted = new Set(docs.map((doc) => doc.id));
  for (const row of existing) {
    if (wanted.has(row.id)) continue;
    if (id === CUTOVER_MARKER_CONTAINER && row.id === CUTOVER_MARKER_ID) continue;
    if (flags.prune && canPrune(id, flags) && !isCosmosNative(id, row)) plan.prune.push(row);
    else plan.kept.push(row);
  }
  return plan;
}

/**
 * The query for the other rows that hold `doc`'s unique key (unique keys
 * apply per partition, so the partition field is part of it), or null when
 * the container has none. A 409 on such a container names the clash with it.
 * A doc missing one of those fields gets { missingFields } instead.
 */
export function uniqueKeyQuery(id, doc) {
  const { partitionKey, uniqueKeys } = CONTAINERS[id];
  if (!uniqueKeys) return null;
  const fields = [...new Set([partitionKey, ...uniqueKeys.flat()].map((p) => p.slice(1)))];
  const missingFields = fields.filter((field) => doc[field] === undefined || doc[field] === null);
  if (missingFields.length > 0) return { missingFields };
  const clauses = ["c.id != @id"];
  const parameters = [{ name: "@id", value: doc.id }];
  fields.forEach((field, i) => {
    clauses.push(`c["${field}"] = @k${i}`);
    parameters.push({ name: `@k${i}`, value: doc[field] });
  });
  return { query: `SELECT c.id FROM c WHERE ${clauses.join(" AND ")}`, parameters };
}

/** Full Cosmos rows as they would be after `plan` ran (for dry-run checks). */
export function afterPlan(rows, plan) {
  const pruned = new Set(plan.prune.map((row) => row.id));
  const byId = new Map(rows.filter((row) => !pruned.has(row.id)).map((row) => [row.id, row]));
  for (const doc of [...plan.create, ...plan.overwrite]) byId.set(doc.id, doc);
  return [...byId.values()];
}

/** The lock rows --backfill-quote-locks writes for the quotes the checks list. */
export function backfillLockRows(quotesWithoutLock, now) {
  return quotesWithoutLock
    .filter((q) => q.quoteNumber)
    .map(({ quoteNumber }) => quoteNumberLock(quoteNumber, now));
}

/** What to do about invoices, quotes or payments that differ from the backup. */
export function driftAdvice(flags) {
  if (!flags.preCutover) return "Re-run with --pre-cutover.";
  return (
    "--pre-cutover already ran, so these rows are newer in Cosmos or were not written. " +
    "Check them; --force-overwrite replaces newer rows, or remove the stray rows by hand."
  );
}

/** The lock row that reserves a quote number, as createCosmosLocks writes it. */
export function quoteNumberLock(quoteNumber, now) {
  const key = `quoteNumber:${quoteNumber}`;
  return { id: lockId(key), key, createdAt: now };
}

/**
 * Data checks run after the import. Every list is a problem to look at; none
 * of them stops the run.
 *   invoices, payments, quotes, locks  Cosmos rows
 *   backupPayments                     payments rows from the backup, or null
 *                                      when this run did not load them
 *   backupState                        { invoices, quotes, payments } backup
 *                                      rows, each null when not loaded
 */
export function dataChecks({ invoices, payments, quotes, locks, backupPayments, backupState }) {
  const byNumber = new Map();
  const badInvoices = [];
  for (const invoice of invoices) {
    const problems = [];
    if (typeof invoice.invoiceNumber !== "string" || !invoice.invoiceNumber) {
      problems.push("no invoiceNumber");
    } else {
      const ids = byNumber.get(invoice.invoiceNumber) ?? [];
      ids.push(invoice.id);
      byNumber.set(invoice.invoiceNumber, ids);
    }
    const total = typeof invoice.total === "number" ? invoice.total : Number.NaN;
    if (!(total > 0)) problems.push(`total ${invoice.total}`);
    if (typeof invoice.currency !== "string" || !invoice.currency) problems.push("no currency");
    if (problems.length > 0) badInvoices.push({ id: invoice.id, problems });
  }
  const duplicateInvoiceNumbers = [...byNumber]
    .filter(([, ids]) => ids.length > 1)
    .map(([invoiceNumber, ids]) => ({ invoiceNumber, ids }));

  let paymentProblems = null;
  if (backupPayments) {
    const cosmosById = new Map(payments.map((p) => [p.id, p]));
    paymentProblems = [];
    for (const row of backupPayments) {
      const cosmos = cosmosById.get(row.id);
      if (!cosmos)
        paymentProblems.push({ id: row.id, problem: "not in Cosmos under its Appwrite id" });
      else if ((cosmos.paystackReference ?? null) !== (row.paystackReference ?? null)) {
        paymentProblems.push({ id: row.id, problem: "paystackReference differs from the backup" });
      }
    }
  }

  const lockIds = new Set(locks.map((lock) => lock.id));
  const quotesWithoutLock = [];
  for (const quote of quotes) {
    if (typeof quote.quoteNumber !== "string" || !quote.quoteNumber) {
      quotesWithoutLock.push({ id: quote.id, quoteNumber: null });
    } else if (!lockIds.has(quoteNumberLock(quote.quoteNumber).id)) {
      quotesWithoutLock.push({ id: quote.id, quoteNumber: quote.quoteNumber });
    }
  }

  const cosmosState = { invoices, quotes, payments };
  const stateDrift = [];
  for (const container of DRIFT_CHECKED) {
    const backupRows = backupState?.[container];
    if (!backupRows) continue;
    const cosmosById = new Map(cosmosState[container].map((r) => [r.id, r]));
    for (const backupRow of backupRows) {
      const problem = driftOf(cosmosById.get(backupRow.id), backupRow);
      if (problem) stateDrift.push({ container, id: backupRow.id, problem });
    }
  }

  return { duplicateInvoiceNumbers, badInvoices, paymentProblems, quotesWithoutLock, stateDrift };
}

/** Containers whose status the cutover must carry over exactly. */
export const DRIFT_CHECKED = ["invoices", "quotes", "payments"];

function driftOf(cosmos, backup) {
  if (!cosmos) return "not in Cosmos";
  const parts = [];
  if ((cosmos.status ?? null) !== (backup.status ?? null)) {
    parts.push(`status ${cosmos.status}, backup ${backup.status}`);
  }
  if ((cosmos.updatedAt ?? null) !== (backup.updatedAt ?? null)) {
    parts.push(`updatedAt ${cosmos.updatedAt}, backup ${backup.updatedAt}`);
  }
  return parts.length > 0 ? parts.join("; ") : null;
}
