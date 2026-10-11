import { Link, Navigate, useParams } from "react-router-dom";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading } from "./QuoteShell";
import InactiveLink from "./InactiveLink";
import { useClientQuote } from "./useClientQuote";
import { formatDate, formatMinor } from "@/utils/quoteMath";

export default function StageInvoicePage() {
  const { token = "", stageId = "" } = useParams();
  const { state, reload } = useClientQuote(token, true);
  if (state.kind === "loading")
    return (
      <QuoteShell title="Invoice" width="narrow">
        <QuoteLoading />
      </QuoteShell>
    );
  if (state.kind === "inactive")
    return (
      <QuoteShell title="Link not active" width="narrow">
        <InactiveLink />
      </QuoteShell>
    );
  if (state.kind === "error")
    return (
      <QuoteShell title="Invoice" width="narrow">
        <QuoteError message={state.message} onRetry={reload} />
      </QuoteShell>
    );

  const { quote } = state;
  const stage = quote.stages.find((s) => s.id === stageId);
  if (!stage || stage.state === "later") return <Navigate to={`/q/${token}`} replace />;
  const money = (m: number) => formatMinor(m, quote.currency);

  return (
    <QuoteShell title={`Invoice ${stage.invoiceNumber}`} width="narrow">
      <QuoteCard>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="font-mono text-[11px] uppercase tracking-[0.12em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Invoice
            </p>
            <h1
              className="text-xl sm:text-2xl font-bold break-words"
              style={{ color: "var(--text-primary)" }}
            >
              {stage.invoiceNumber}
            </h1>
          </div>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            style={
              stage.state === "paid"
                ? { background: "var(--status-success-bg)", color: "var(--status-success-text)" }
                : { background: "var(--status-pending-bg)", color: "var(--status-pending-text)" }
            }
          >
            {stage.state === "paid" ? "Paid" : stage.overdue ? "Overdue" : "Due"}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <dt style={{ color: "var(--text-secondary)" }}>Billed to</dt>
            <dd style={{ color: "var(--text-primary)" }}>
              {quote.clientName}
              {quote.clientCompany ? `, ${quote.clientCompany}` : ""}
            </dd>
          </div>
          <div>
            <dt style={{ color: "var(--text-secondary)" }}>From</dt>
            <dd style={{ color: "var(--text-primary)" }}>OceanicCoder · hello@oceaniccoder.dev</dd>
          </div>
          <div>
            <dt style={{ color: "var(--text-secondary)" }}>Issued</dt>
            <dd style={{ color: "var(--text-primary)" }}>{formatDate(stage.dueAt)}</dd>
          </div>
          <div>
            <dt style={{ color: "var(--text-secondary)" }}>Due by</dt>
            <dd style={{ color: "var(--text-primary)" }}>{formatDate(stage.dueBy)}</dd>
          </div>
        </dl>
        <table className="w-full mt-6 text-sm">
          <tbody>
            <tr className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <td className="py-3" style={{ color: "var(--text-primary)" }}>
                {stage.label} ({stage.percent}%) for {quote.title}
                <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                  Quote {quote.quoteNumber}
                </span>
              </td>
              <td
                className="py-3 pl-3 text-right tabular-nums whitespace-nowrap"
                style={{ color: "var(--text-primary)" }}
              >
                {money(stage.amountMinor)}
              </td>
            </tr>
            <tr className="border-t-2" style={{ borderColor: "var(--text-primary)" }}>
              <td className="py-3 font-bold" style={{ color: "var(--text-primary)" }}>
                Amount {stage.state === "paid" ? "paid" : "due"}
              </td>
              <td
                className="py-3 pl-3 text-right font-bold tabular-nums whitespace-nowrap"
                style={{ color: "var(--text-primary)" }}
              >
                {money(stage.amountMinor)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-wrap gap-3 mt-6 print:hidden">
          {stage.state === "due" && (
            <Link
              to={`/q/${token}/pay/${stage.id}`}
              className="px-5 py-3 rounded-xl font-semibold text-white"
              style={{ background: "var(--quote-cta)" }}
            >
              Pay now
            </Link>
          )}
          {stage.receiptPath && (
            <Link
              to={stage.receiptPath}
              className="px-5 py-3 rounded-xl border"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              Receipt
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-3 rounded-xl border"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            Print or save PDF
          </button>
          <Link
            to={`/q/${token}`}
            className="px-5 py-3 text-sm underline"
            style={{ color: "var(--text-secondary)" }}
          >
            Back to quote
          </Link>
        </div>
      </QuoteCard>
    </QuoteShell>
  );
}
