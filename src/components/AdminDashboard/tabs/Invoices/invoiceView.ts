// Pure view helpers for the Invoices tab: one row shape for one-off invoices
// and quote stage invoices, plus filters, search and the KPI totals.
import type { Invoice, InvoiceItem } from "@/types";
import type { QuoteStageInvoice, QuoteSummary } from "@/types/quote";
import { sumByCurrency, type CurrencyTotals } from "../shared/money";
import { isArchivedInvoice } from "../invoiceArchive";

export type InvoiceStatus = "draft" | "due" | "overdue" | "paid";

/** A quote stage invoice, read-only here; it's managed from the quote. */
export interface QuoteInvoiceRow extends QuoteStageInvoice {
  quoteId: string;
  quoteNumber: string;
  title: string;
  clientName: string;
  clientEmail: string;
  currency: string;
}

interface RowBase {
  key: string;
  number: string;
  clientName: string;
  clientEmail: string;
  currency: string;
  /** Major units. */
  amount: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  status: InvoiceStatus;
  archived: boolean;
}

export type InvoiceRow =
  | (RowBase & { kind: "oneoff"; invoice: Invoice })
  | (RowBase & { kind: "quote"; stage: QuoteInvoiceRow });

/** Quote stage invoices, flattened from the admin quote list. */
export function quoteRows(quotes: QuoteSummary[]): QuoteInvoiceRow[] {
  return quotes.flatMap((q) =>
    (q.invoices || []).map((inv) => ({
      ...inv,
      quoteId: q.id,
      quoteNumber: q.quoteNumber,
      title: q.title,
      clientName: q.clientName,
      clientEmail: q.clientEmail || "",
      currency: q.currency,
    })),
  );
}

/** Line items are stored as a JSON string; anything unreadable is no items. */
export function parseItems(raw: unknown): InvoiceItem[] {
  if (Array.isArray(raw)) return raw as InvoiceItem[];
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InvoiceItem[]) : [];
  } catch {
    return [];
  }
}

// Calendar days are Accra days (the business runs on GMT), whatever zone the
// admin's browser is in. en-CA formats as YYYY-MM-DD, which sorts as text.
const accraDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Accra",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** A due date counts until the end of that day in Accra. */
function pastDue(dueDate: string | undefined, now: Date): boolean {
  if (!dueDate) return false;
  let due = dueDate;
  // A plain date is already a calendar day; a timestamp is read in Accra.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    const at = new Date(dueDate);
    if (Number.isNaN(at.getTime())) return false;
    due = accraDay.format(at);
  }
  return accraDay.format(now) > due;
}

export function oneOffStatus(inv: Invoice, now: Date): InvoiceStatus {
  if (inv.status === "paid") return "paid";
  if (inv.status === "draft") return "draft";
  return pastDue(inv.dueDate, now) ? "overdue" : "due";
}

const stageStatus = (s: QuoteInvoiceRow): InvoiceStatus =>
  s.state === "paid" ? "paid" : s.overdue ? "overdue" : "due";

const sortKey = (r: InvoiceRow) => r.issuedAt || r.paidAt || r.dueAt || "";

/** Every invoice as one row type, newest first. */
export function toInvoiceRows(
  invoices: Invoice[],
  stages: QuoteInvoiceRow[],
  now: Date,
): InvoiceRow[] {
  const rows: InvoiceRow[] = [
    ...invoices.map(
      (inv): InvoiceRow => ({
        kind: "oneoff",
        key: inv.$id,
        number: inv.invoiceNumber,
        clientName: inv.clientName,
        clientEmail: inv.clientEmail,
        currency: inv.currency,
        amount: Number(inv.total) || 0,
        issuedAt: inv.$createdAt || null,
        dueAt: inv.dueDate || null,
        paidAt: null,
        status: oneOffStatus(inv, now),
        archived: isArchivedInvoice(inv),
        invoice: inv,
      }),
    ),
    ...stages.map(
      (s): InvoiceRow => ({
        kind: "quote",
        key: `${s.quoteId}:${s.stageId}`,
        number: s.invoiceNumber,
        clientName: s.clientName,
        clientEmail: s.clientEmail,
        currency: s.currency,
        amount: s.amountMinor / 100,
        issuedAt: s.issuedAt ?? null,
        dueAt: s.dueBy,
        paidAt: s.paidAt,
        status: stageStatus(s),
        // Quote stage invoices are derived from the quote; nothing to archive.
        archived: false,
        stage: s,
      }),
    ),
  ];
  return rows.sort((a, b) => (sortKey(b) > sortKey(a) ? 1 : sortKey(b) < sortKey(a) ? -1 : 0));
}

export type InvoiceFilter = "all" | "draft" | "due" | "overdue" | "paid" | "archived";

export const INVOICE_FILTER_LABELS: Record<InvoiceFilter, string> = {
  all: "All",
  draft: "Draft",
  due: "Due",
  overdue: "Overdue",
  paid: "Paid",
  archived: "Archived",
};

/** Archived rows only appear under Archived; the other filters are by status. */
export function inInvoiceFilter(row: InvoiceRow, filter: InvoiceFilter): boolean {
  if (filter === "archived") return row.archived;
  if (row.archived) return false;
  return filter === "all" || row.status === filter;
}

export type SourceFilter = "all" | "quotes" | "oneoff";

export const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "quotes", label: "Quote stages" },
  { value: "oneoff", label: "One-off" },
];

export const inSource = (row: InvoiceRow, source: SourceFilter) =>
  source === "all" || (source === "quotes" ? row.kind === "quote" : row.kind === "oneoff");

/** Case-insensitive match on invoice number, client, email and quote number. */
export function matchesInvoiceSearch(row: InvoiceRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [row.number, row.clientName, row.clientEmail];
  if (row.kind === "quote") fields.push(row.stage.quoteNumber);
  return fields.some((f) => typeof f === "string" && f.toLowerCase().includes(q));
}

export interface InvoiceKpis {
  invoiced: CurrencyTotals;
  paid: CurrencyTotals;
  outstandingCount: number;
  outstanding: CurrencyTotals;
  overdueCount: number;
  overdue: CurrencyTotals;
}

const totals = (rows: InvoiceRow[]) =>
  sumByCurrency(
    rows,
    (r) => r.amount,
    (r) => r.currency,
  );

/** Over non-archived rows. Drafts haven't been sent, so they count nowhere. */
export function computeInvoiceKpis(rows: InvoiceRow[]): InvoiceKpis {
  const live = rows.filter((r) => !r.archived && r.status !== "draft");
  const outstanding = live.filter((r) => r.status === "due" || r.status === "overdue");
  const overdue = live.filter((r) => r.status === "overdue");
  return {
    invoiced: totals(live),
    paid: totals(live.filter((r) => r.status === "paid")),
    outstandingCount: outstanding.length,
    outstanding: totals(outstanding),
    overdueCount: overdue.length,
    overdue: totals(overdue),
  };
}
