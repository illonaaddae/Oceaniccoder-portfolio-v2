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

// The Invoices tab opens a quote the same way: the id waits here until the
// Quotes tab mounts and shows that quote's detail.
let pendingOpen: string | null = null;

export function setPendingQuoteOpen(id: string) {
  pendingOpen = id;
}

export function peekPendingQuoteOpen(): string | null {
  return pendingOpen;
}

export function clearPendingQuoteOpen() {
  pendingOpen = null;
}
