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
      <QuoteCard>
        <p
          className="font-mono text-[11px] uppercase tracking-[0.12em]"
          style={{ color: "var(--status-success-text)" }}
        >
          Payment received
        </p>
        <h1
          className="text-3xl font-bold tabular-nums mt-1"
          style={{ color: "var(--text-primary)" }}
        >
          {money(receipt.amountMinor)}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Quote {receipt.quoteNumber} · OceanicCoder · hello@oceaniccoder.dev
        </p>
        <dl className="mt-6 divide-y text-sm" style={{ borderColor: "var(--border-subtle)" }}>
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2.5">
              <dt style={{ color: "var(--text-secondary)" }}>{label}</dt>
              <dd className="text-right" style={{ color: "var(--text-primary)" }}>
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
