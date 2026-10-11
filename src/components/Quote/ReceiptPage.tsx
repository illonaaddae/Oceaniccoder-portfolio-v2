import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import { LOGO_PATHS } from "@/components/Navbar/navData";
import QuoteShell, { QuoteError, QuoteLoading } from "./QuoteShell";
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
  const details: [string, string][] = [
    [
      "Received from",
      `${receipt.clientName}${receipt.clientCompany ? `, ${receipt.clientCompany}` : ""}`,
    ],
    ["Paid by", receipt.method],
    ["For", `Quote ${receipt.quoteNumber}: ${receipt.title}`],
    ["Stage", `${receipt.stageLabel} · ${receipt.invoiceNumber}`],
  ];

  // One document, like a paper receipt: brand header, body, contact footer.
  return (
    <QuoteShell title={`Receipt ${receipt.reference}`} width="narrow">
      <article
        className="rounded-2xl border overflow-hidden print:rounded-none print:border-0"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
      >
        <header className="quote-on-dark flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8 bg-[linear-gradient(135deg,#04333B_0%,#085866_100%)] print:bg-none print:border-b print:border-gray-300">
          <img
            src={LOGO_PATHS.dark}
            alt="Oceaniccoder"
            className="h-8 w-auto brightness-0 invert print:hidden"
            width="112"
            height="32"
          />
          <div className="text-right">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#8dd7e7] print:text-gray-600">
              Receipt
            </p>
            <p className="font-mono text-sm font-bold">{receipt.reference}</p>
          </div>
        </header>

        <div className="p-6 sm:p-8">
          <h1 className="sr-only">Receipt {receipt.reference}</h1>
          <p
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: "var(--status-success-bg)", color: "var(--status-success-text)" }}
          >
            <FaCheckCircle aria-hidden /> Paid
          </p>
          <p
            className="mt-4 text-4xl font-bold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {money(receipt.amountMinor)}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {formatDate(receipt.paidAt)}
          </p>

          <dl className="mt-8 grid gap-x-8 gap-y-5 text-base sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt style={{ color: "var(--text-secondary)" }}>{label}</dt>
                <dd
                  className="mt-0.5 font-semibold break-words"
                  style={{ color: "var(--text-primary)" }}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div
            className="mt-8 pt-5 border-t flex justify-between text-lg font-semibold"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            <span>Balance remaining</span>
            <span className="tabular-nums">
              {receipt.balanceMinor > 0 ? money(receipt.balanceMinor) : "Fully paid"}
            </span>
          </div>
        </div>

        <footer
          className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4 text-xs sm:px-8"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
        >
          <span>OceanicCoder · Web and app development</span>
          <span>hello@oceaniccoder.dev · oceaniccoder.dev</span>
        </footer>
      </article>
      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-5 py-3 rounded-xl border"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        >
          Print or save PDF
        </button>
      </div>
    </QuoteShell>
  );
}
