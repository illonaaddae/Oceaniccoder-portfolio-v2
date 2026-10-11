import type { QuoteDraft } from "@/types/quote";

// Client Work's "Create quote" switches to the Quotes tab, which mounts fresh.
// The inquiry's draft waits here so the editor opens prefilled. Reading and
// clearing are separate because StrictMode runs state initialisers twice.
let pending: Partial<QuoteDraft> | null = null;

export function setPendingQuoteDraft(draft: Partial<QuoteDraft>) {
  pending = draft;
}

export function peekPendingQuoteDraft(): Partial<QuoteDraft> | null {
  return pending;
}

export function clearPendingQuoteDraft() {
  pending = null;
}
