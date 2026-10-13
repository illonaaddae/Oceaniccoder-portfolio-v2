import type { Payment } from "@/services/api/payments";

/** What the Payments tab shows, which is not always the stored status. */
export type DisplayStatus = "paid" | "pending" | "failed" | "abandoned" | "duplicate" | "refunded";

/**
 * /api/quote-pay writes a pending row each time a client opens checkout and
 * nothing marks it abandoned when they close the window. After this long a
 * pending row is shown as abandoned. This is display only: if the charge does
 * settle later, the row becomes "success" and shows as paid.
 */
export const ABANDON_AFTER_MS = 30 * 60 * 1000;

type StatusFields = Pick<Payment, "status" | "$createdAt" | "quoteNumber" | "stageId">;

const stageKey = (p: Pick<Payment, "quoteNumber" | "stageId">) =>
  p.quoteNumber && p.stageId ? `${p.quoteNumber}\u0000${p.stageId}` : null;

/** Rows with no status predate the field and were always successful payments. */
export const isSuccess = (p: Pick<Payment, "status">) => !p.status || p.status === "success";

/** The quote stages that already have a successful payment. */
export function paidStageKeys(payments: StatusFields[]): Set<string> {
  const keys = new Set<string>();
  for (const p of payments) {
    const key = stageKey(p);
    if (key && isSuccess(p)) keys.add(key);
  }
  return keys;
}

/**
 * The status to show for one payment. A pending row counts as abandoned when
 * it is older than ABANDON_AFTER_MS, or when the same quote stage has been
 * paid by another attempt (the client retried and the retry went through).
 */
export function displayStatus(
  p: StatusFields,
  paidStages: Set<string>,
  nowMs: number,
): DisplayStatus {
  switch (p.status) {
    case undefined:
    case "success":
      return "paid";
    case "failed":
    case "abandoned":
    case "duplicate":
    case "refunded":
      return p.status;
    case "pending": {
      const key = stageKey(p);
      if (key && paidStages.has(key)) return "abandoned";
      const started = Date.parse(p.$createdAt);
      if (!Number.isNaN(started) && nowMs - started > ABANDON_AFTER_MS) return "abandoned";
      return "pending";
    }
    default:
      // An unknown value from the server: show it as failed rather than paid,
      // so it never inflates the money received.
      return "failed";
  }
}

const PAYSTACK_FAILURE_NOTE = "Paystack: ";

type ArchiveFields = Pick<Payment, "status" | "archivedAt" | "paystackId" | "note">;

/**
 * Whether a row may be archived: only attempts where no money was taken.
 * Mirrors canArchivePayment in api/shared/quotes/model.js, which enforces it:
 * pending and abandoned rows, and failed rows with no Paystack id or a plain
 * Paystack failure note. Paid, duplicate (refund owed), refunded and captured
 * mismatches stay on record.
 */
export function canArchive(p: ArchiveFields): boolean {
  if (p.status === "pending" || p.status === "abandoned") return true;
  if (p.status !== "failed") return false;
  if (!p.paystackId) return true;
  return typeof p.note === "string" && p.note.startsWith(PAYSTACK_FAILURE_NOTE);
}

/**
 * Archived means hidden from the normal views. A row holding money is never
 * treated as archived, even if a stray flag is set (an archive that raced the
 * webhook): money received stays visible.
 */
export const isArchived = (p: ArchiveFields) => Boolean(p.archivedAt) && canArchive(p);
