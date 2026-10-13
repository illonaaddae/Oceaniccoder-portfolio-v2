import { formatDate } from "@/utils/quoteMath";
import { DataTable, muted, strong, type Column, type RowMenu } from "../shared/DataTable";
import { StatusPill, type PillTone } from "../shared/StatusPill";
import { formatMoney } from "../shared/money";
import { InvoiceDetails } from "./InvoiceDetails";
import { parseItems, type InvoiceRow, type InvoiceStatus } from "./invoiceView";

const TONE: Record<InvoiceStatus, PillTone> = {
  draft: "neutral",
  due: "pending",
  overdue: "failed",
  paid: "success",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  due: "Due",
  overdue: "Overdue",
  paid: "Paid",
};

const dateOrDash = (iso: string | null) => formatDate(iso) || "—";

/** "Q-2026-0001 · Deposit" for a quote stage, "One-off · 2 items" otherwise. */
export function forLabel(row: InvoiceRow): string {
  if (row.kind === "quote") return `${row.stage.quoteNumber} · ${row.stage.label}`;
  const n = parseItems(row.invoice.items).length;
  return `One-off · ${n} ${n === 1 ? "item" : "items"}`;
}

const Pill = ({ row }: { row: InvoiceRow }) => (
  <StatusPill
    tone={TONE[row.status]}
    label={INVOICE_STATUS_LABEL[row.status]}
    archived={row.archived}
  />
);

const ClientCell = ({ row }: { row: InvoiceRow }) => (
  <>
    <div className="font-medium" style={strong}>
      {row.clientName}
    </div>
    {row.clientEmail && (
      <div className="text-xs" style={muted}>
        {row.clientEmail}
      </div>
    )}
  </>
);

const COLUMNS: Column<InvoiceRow>[] = [
  {
    header: "Invoice #",
    className: "whitespace-nowrap font-medium",
    style: strong,
    cell: (r) => r.number,
  },
  { header: "Client", cell: (r) => <ClientCell row={r} /> },
  { header: "For", style: strong, cell: (r) => forLabel(r) },
  {
    header: "Issued",
    className: "whitespace-nowrap",
    style: strong,
    cell: (r) => dateOrDash(r.issuedAt),
  },
  {
    header: "Due",
    className: "whitespace-nowrap",
    style: strong,
    cell: (r) => dateOrDash(r.dueAt),
  },
  {
    header: "Amount",
    align: "right",
    className: "whitespace-nowrap font-semibold tabular-nums",
    style: strong,
    cell: (r) => formatMoney(r.amount, r.currency),
  },
  { header: "Status", cell: (r) => <Pill row={r} /> },
];

const CARD = {
  header: (r: InvoiceRow) => (
    <>
      <div className="font-semibold" style={strong}>
        {r.clientName}
      </div>
      {r.clientEmail && (
        <div className="truncate text-xs" style={muted}>
          {r.clientEmail}
        </div>
      )}
    </>
  ),
  body: (r: InvoiceRow) => (
    <>
      <div className="font-medium" style={strong}>
        {r.number}
      </div>
      <div className="text-xs" style={muted}>
        {forLabel(r)}
      </div>
      <div className="mt-1 text-xs" style={muted}>
        Issued {dateOrDash(r.issuedAt)} · Due {dateOrDash(r.dueAt)}
      </div>
    </>
  ),
  aside: (r: InvoiceRow) => (
    <>
      <div className="font-semibold tabular-nums" style={strong}>
        {formatMoney(r.amount, r.currency)}
      </div>
      <div className="mt-1">
        <Pill row={r} />
      </div>
    </>
  ),
};

interface InvoicesTableProps {
  rows: InvoiceRow[];
  expanded: Set<string>;
  onToggle: (key: string) => void;
  actionsFor: (row: InvoiceRow) => RowMenu;
}

export function InvoicesTable({ rows, expanded, onToggle, actionsFor }: InvoicesTableProps) {
  return (
    <DataTable
      caption="Invoices"
      rows={rows}
      rowKey={(r) => r.key}
      rowName={(r) => r.number}
      columns={COLUMNS}
      card={CARD}
      details={(r, id) => <InvoiceDetails row={r} id={id} />}
      expanded={expanded}
      onToggle={onToggle}
      actionsFor={actionsFor}
      idPrefix="invoice"
    />
  );
}
