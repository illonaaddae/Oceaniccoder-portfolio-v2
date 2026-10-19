// What scripts/import-to-cosmos.mjs decides, kept free of Cosmos and file
// access so the rules are unit-tested (import-plan.test.mjs): which flags are
// allowed together, and for each container which backup rows are created,
// overwritten or skipped and which Cosmos rows are pruned.

import { createRequire } from "node:module";

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

// Money and quote state: a row already in Cosmos may have been written by the
// live webhook or quote service, so it is never overwritten and never pruned,
// whatever the flags say.
export const CREATE_ONLY_CONTAINERS = new Set(["payments", "invoices", "quotes", "locks"]);

// Visitors write these through /api/submit, which already writes to Cosmos,
// so Cosmos holds rows Appwrite never had.
export const SUBMITTED_CONTAINERS = new Set(Object.keys(SCHEMAS));

/** The settings row that records the cutover. Never public, never imported. */
export const CUTOVER_MARKER_ID = "cutover";

/** Containers --prune may delete from. */
export function canPrune(id) {
  return !CREATE_ONLY_CONTAINERS.has(id) && !SUBMITTED_CONTAINERS.has(id) && canDelete(id);
}

const BOOLEAN_FLAGS = {
  "--dry-run": "dryRun",
  "--insert-only": "insertOnly",
  "--force-overwrite": "forceOverwrite",
  "--prune": "prune",
  "--pre-cutover": "preCutover",
  "--mark-cutover": "markCutover",
  "--backfill-quote-locks": "backfillQuoteLocks",
};
const VALUE_FLAGS = { "--backup": "backup", "--only": "only" };

/** Command-line arguments → flags. Throws UsageError on anything it can't honour. */
export function parseArgs(argv) {
  const flags = {
    backup: undefined,
    only: null,
    dryRun: false,
    insertOnly: false,
    forceOverwrite: false,
    prune: false,
    preCutover: false,
    markCutover: false,
    backfillQuoteLocks: false,
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

  if (flags.markCutover && given.some((arg) => arg !== "--mark-cutover")) {
    throw new UsageError("--mark-cutover runs on its own");
  }
  if (flags.prune && !flags.preCutover) {
    throw new UsageError("--prune needs --pre-cutover: pruning is only safe before cutover");
  }
  if (flags.prune && flags.insertOnly) {
    throw new UsageError("--prune and --insert-only can't be combined");
  }
  if (flags.forceOverwrite && flags.insertOnly) {
    throw new UsageError("--force-overwrite and --insert-only can't be combined");
  }
  if (flags.prune && flags.only) {
    const refused = flags.only.filter((id) => !canPrune(id));
    if (refused.length > 0) {
      throw new UsageError(`--prune never deletes from ${refused.join(", ")}`);
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
export function refusalAfterCutover(flags, marker) {
  if (!marker) return null;
  if (!flags.prune && !flags.preCutover) return null;
  return (
    `Cutover was marked at ${marker.at} by ${marker.by}. ` +
    "--prune and --pre-cutover are refused after cutover: Cosmos is the live database."
  );
}

/** The settings row --mark-cutover writes. */
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
  const createOnly = CREATE_ONLY_CONTAINERS.has(id) || flags.insertOnly;
  const byId = new Map(existing.map((row) => [row.id, row]));
  const plan = {
    mode: CREATE_ONLY_CONTAINERS.has(id)
      ? "create-only"
      : flags.insertOnly
        ? "insert-only"
        : "upsert",
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
    if (id === "settings" && row.id === CUTOVER_MARKER_ID) continue;
    if (flags.prune && canPrune(id)) plan.prune.push(row);
    else plan.kept.push(row);
  }
  return plan;
}

/** Full Cosmos rows as they would be after `plan` ran (for dry-run checks). */
export function afterPlan(rows, plan) {
  const pruned = new Set(plan.prune.map((row) => row.id));
  const byId = new Map(rows.filter((row) => !pruned.has(row.id)).map((row) => [row.id, row]));
  for (const doc of [...plan.create, ...plan.overwrite]) byId.set(doc.id, doc);
  return [...byId.values()];
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
 */
export function dataChecks({ invoices, payments, quotes, locks, backupPayments }) {
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

  return { duplicateInvoiceNumbers, badInvoices, paymentProblems, quotesWithoutLock };
}
