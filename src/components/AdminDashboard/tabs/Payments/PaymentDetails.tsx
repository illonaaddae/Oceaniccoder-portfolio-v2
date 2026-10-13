import type { Payment } from "@/services/api/payments";

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Everything stored on one payment, shown when its row is expanded.
 * `archived` is the derived state (isArchived), not the raw field: a stray
 * archivedAt on a row holding money (an archive that raced the webhook) is
 * not shown.
 */
export function PaymentDetails({
  payment,
  archived,
  id,
}: {
  payment: Payment;
  archived: boolean;
  id: string;
}) {
  const fields: [string, string | undefined][] = [
    ["Started", formatDateTime(payment.$createdAt)],
    ["Paid", formatDateTime(payment.paidAt)],
    ["Channel", payment.channel],
    ["Paystack ID", payment.paystackId],
    ["Reference", payment.paystackReference],
    ["Note", payment.note],
    ["Recorded by", payment.recordedBy],
    ["Archived", archived ? formatDateTime(payment.archivedAt) : ""],
  ];
  return (
    <dl
      id={id}
      aria-label={`Details for ${payment.paystackReference || payment.invoiceNumber}`}
      className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            {label}
          </dt>
          <dd className="break-words" style={{ color: "var(--text-primary)" }}>
            {value || <span style={{ color: "var(--text-secondary)" }}>None</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
