import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading } from "./QuoteShell";
import { fetchReceipt } from "@/services/api/quotes";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import type { ReceiptView } from "@/types/quote";

export default function ReceiptPage() {
  const { reference = "" } = useParams();
  const [params] = useSearchParams();
  const [receipt, setReceipt] = useState<ReceiptView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReceipt(reference, params.get("s") || "")
      .then((r) => setReceipt(r.receipt))
      .catch((err) => setError(err instanceof Error ? err.message : "Receipt not found."));
  }, [reference, params]);

  if (error)
    return (
      <QuoteShell title="Receipt" width="narrow">
        <QuoteError message={error} />
      </QuoteShell>
    );
  if (!receipt)
    return (
      <QuoteShell title="Receipt" width="narrow">
        <QuoteLoading />
      </QuoteShell>
    );
  const money = (m: number) => formatMinor(m, receipt.currency);
  const rows: [string, string][] = [
    [
      "Received from",
      `${receipt.clientName}${receipt.clientCompany ? `, ${receipt.clientCompany}` : ""}`,
    ],
    ["For", `${receipt.stageLabel}, ${receipt.title}`],
    ["Invoice", receipt.invoiceNumber],
    ["Method", receipt.method],
    ["Reference", receipt.reference],
    ["Date", formatDate(receipt.paidAt)],
    ["Remaining balance", receipt.balanceMinor > 0 ? money(receipt.balanceMinor) : "Fully paid"],
  ];

  return (
    <QuoteShell title={`Receipt ${receipt.reference}`} width="narrow">
      <section className="quote-on-dark rounded-2xl p-6 sm:p-8 bg-[linear-gradient(135deg,#04333B_0%,#085866_100%)] print:bg-none print:border print:border-gray-300">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#8dd7e7] print:text-gray-600">
              Receipt · Quote {receipt.quoteNumber}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2 leading-tight">{receipt.title}</h1>
          </div>
          <div className="sm:text-right shrink-0">
            <p className="text-sm text-white/75 print:text-gray-600">Payment received</p>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">
              {money(receipt.amountMinor)}
            </p>
          </div>
        </div>
      </section>
      <QuoteCard>
        <dl className="divide-y divide-[color:var(--border-subtle)] text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2.5">
              <dt className="shrink-0" style={{ color: "var(--text-secondary)" }}>
                {label}
              </dt>
              <dd className="min-w-0 text-right break-all" style={{ color: "var(--text-primary)" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-6 px-5 py-3 rounded-xl border print:hidden"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        >
          Print or save PDF
        </button>
      </QuoteCard>
    </QuoteShell>
  );
}
