import { StatusPill } from "./StatusPill";
import { PaymentDetails, formatDateTime } from "./PaymentDetails";
import { DataTable, muted, strong, type Column, type RowMenu } from "../shared/DataTable";
import { formatMoney } from "../shared/money";
import { methodLabel, momoNetworkLabel, receivedAt, type PaymentRow } from "./paymentView";

interface PaymentsTableProps {
  rows: PaymentRow[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  actionsFor: (row: PaymentRow) => RowMenu;
}

const rowName = (r: PaymentRow) => r.payment.paystackReference || r.payment.invoiceNumber;

function ForCell({ row }: { row: PaymentRow }) {
  const p = row.payment;
  return (
    <>
      <div className="font-medium" style={strong}>
        {p.invoiceNumber}
      </div>
      {p.quoteNumber && (
        <div className="text-xs" style={muted}>
          Quote {p.quoteNumber}
          {p.stageId ? ` · ${p.stageId}` : ""}
        </div>
      )}
    </>
  );
}

function ClientCell({ row }: { row: PaymentRow }) {
  return (
    <>
      <div className="font-medium" style={strong}>
        {row.payment.clientName}
      </div>
      <div className="text-xs" style={muted}>
        {row.payment.clientEmail}
      </div>
    </>
  );
}

function MethodCell({ row }: { row: PaymentRow }) {
  const network = momoNetworkLabel(row.payment);
  return (
    <>
      <div style={strong}>{methodLabel(row.payment.method)}</div>
      {network && (
        <div className="text-xs" style={muted}>
          {network}
        </div>
      )}
    </>
  );
}

const COLUMNS: Column<PaymentRow>[] = [
  {
    header: "Date",
    className: "whitespace-nowrap",
    style: strong,
    cell: (r) => formatDateTime(receivedAt(r.payment)),
  },
  { header: "Client", cell: (r) => <ClientCell row={r} /> },
  { header: "For", cell: (r) => <ForCell row={r} /> },
  { header: "Method", cell: (r) => <MethodCell row={r} /> },
  {
    header: "Amount",
    align: "right",
    className: "whitespace-nowrap font-semibold tabular-nums",
    style: strong,
    cell: (r) => formatMoney(r.payment.amount, r.payment.currency),
  },
  {
    header: "Status",
    cell: (r) => <StatusPill status={r.status} archived={r.archived} />,
  },
];

const CARD = {
  header: (r: PaymentRow) => (
    <>
      <div className="font-semibold" style={strong}>
        {r.payment.clientName}
      </div>
      <div className="truncate text-xs" style={muted}>
        {r.payment.clientEmail}
      </div>
    </>
  ),
  body: (r: PaymentRow) => {
    const network = momoNetworkLabel(r.payment);
    return (
      <>
        <ForCell row={r} />
        <div className="mt-1 text-xs" style={muted}>
          {formatDateTime(receivedAt(r.payment))} · {methodLabel(r.payment.method)}
          {network ? ` · ${network}` : ""}
        </div>
      </>
    );
  },
  aside: (r: PaymentRow) => (
    <>
      <div className="font-semibold tabular-nums" style={strong}>
        {formatMoney(r.payment.amount, r.payment.currency)}
      </div>
      <div className="mt-1">
        <StatusPill status={r.status} archived={r.archived} />
      </div>
    </>
  ),
};

/** Table on md and up, stacked cards below. Both receive the same page of rows. */
export function PaymentsTable({ rows, expanded, onToggle, actionsFor }: PaymentsTableProps) {
  return (
    <DataTable
      caption="Payments"
      rows={rows}
      rowKey={(r) => r.payment.$id}
      rowName={rowName}
      columns={COLUMNS}
      card={CARD}
      details={(r, id) => <PaymentDetails payment={r.payment} archived={r.archived} id={id} />}
      expanded={expanded}
      onToggle={onToggle}
      actionsFor={actionsFor}
      idPrefix="payment"
    />
  );
}
