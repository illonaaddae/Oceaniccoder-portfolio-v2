import type React from "react";
import { formatDate } from "@/utils/quoteMath";
import { formatMoney } from "../shared/money";
import { muted, strong } from "../shared/DataTable";
import { parseItems, type InvoiceRow } from "./invoiceView";

const dateOr = (iso?: string | null) => formatDate(iso) || "None";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold" style={muted}>
        {label}
      </dt>
      <dd className="break-words" style={strong}>
        {children}
      </dd>
    </div>
  );
}

/** Line items and totals for a one-off invoice; stage facts for a quote stage. */
export function InvoiceDetails({ row, id }: { row: InvoiceRow; id: string }) {
  if (row.kind === "quote") {
    const s = row.stage;
    return (
      <dl
        id={id}
        aria-label={`Details for ${row.number}`}
        className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <Field label="Quote">
          {s.quoteNumber} · {s.title}
        </Field>
        <Field label="Stage">
          {s.label} ({s.percent}%)
        </Field>
        <Field label="Issued">{dateOr(s.issuedAt)}</Field>
        <Field label="Due by">{dateOr(s.dueBy)}</Field>
        <Field label="Paid">{dateOr(s.paidAt)}</Field>
      </dl>
    );
  }

  const inv = row.invoice;
  const items = parseItems(inv.items);
  return (
    <div id={id} aria-label={`Details for ${row.number}`} role="group" className="space-y-4">
      {items.length > 0 ? (
        <table className="w-full text-sm">
          <caption className="sr-only">Line items for {row.number}</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide" style={muted}>
              <th scope="col" className="py-1 pr-3 font-semibold">
                Item
              </th>
              <th scope="col" className="py-1 pr-3 text-right font-semibold">
                Qty
              </th>
              <th scope="col" className="py-1 pr-3 text-right font-semibold">
                Unit price
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              // Items have no id; position is their identity in a saved invoice.
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i} style={strong}>
                <td className="py-1 pr-3">{item.description}</td>
                <td className="py-1 pr-3 text-right tabular-nums">{item.quantity}</td>
                <td className="py-1 pr-3 text-right tabular-nums">
                  {formatMoney(item.unitPrice, inv.currency)}
                </td>
                <td className="py-1 text-right tabular-nums">
                  {formatMoney(
                    (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
                    inv.currency,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm" style={muted}>
          No line items recorded.
        </p>
      )}
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Subtotal">{formatMoney(inv.subtotal, inv.currency)}</Field>
        <Field label="Tax">{formatMoney(inv.tax, inv.currency)}</Field>
        <Field label="Total">{formatMoney(inv.total, inv.currency)}</Field>
        <Field label="Due">{dateOr(inv.dueDate)}</Field>
        {/* Sometimes free text ("2 weeks") rather than a date. */}
        <Field label="Estimated delivery">
          {formatDate(inv.estimatedDelivery) || inv.estimatedDelivery || "None"}
        </Field>
        <Field label="Notes">{inv.notes || "None"}</Field>
      </dl>
    </div>
  );
}
