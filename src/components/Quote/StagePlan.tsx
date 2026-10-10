import type React from "react";
import { Link } from "react-router-dom";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import type { ClientQuote, ClientStage } from "@/types/quote";

const PILL: Record<ClientStage["state"], { label: string; style: React.CSSProperties }> = {
  paid: {
    label: "Paid",
    style: { background: "var(--status-success-bg)", color: "var(--status-success-text)" },
  },
  due: {
    label: "Due",
    style: { background: "var(--status-pending-bg)", color: "var(--status-pending-text)" },
  },
  later: {
    label: "Later",
    style: { background: "var(--bg-tertiary)", color: "var(--text-secondary)" },
  },
};

export default function StagePlan({ quote, token }: { quote: ClientQuote; token: string }) {
  return (
    <QuoteCard>
      <SectionLabel>How you pay</SectionLabel>
      <ol className="space-y-3">
        {quote.stages.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "#0a0f1a" }}
            >
              {s.index + 1}
            </span>
            <div className="flex-1 min-w-[10rem]">
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                {s.label} <span style={{ color: "var(--text-secondary)" }}>· {s.percent}%</span>
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {s.state === "paid" && s.paidAt
                  ? `Paid ${formatDate(s.paidAt)}`
                  : s.state === "due" && s.dueBy
                    ? `Due by ${formatDate(s.dueBy)}`
                    : s.index === 0
                      ? "Due when you accept"
                      : "Requested when this stage is reached"}
                {s.overdue && (
                  <span
                    className="ml-2 font-semibold"
                    style={{ color: "var(--status-failed-text)" }}
                  >
                    Overdue
                  </span>
                )}
              </p>
            </div>
            <span
              className="font-semibold tabular-nums whitespace-nowrap"
              style={{ color: "var(--text-primary)" }}
            >
              {formatMinor(s.amountMinor, quote.currency)}
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={PILL[s.state].style}
            >
              {PILL[s.state].label}
            </span>
            <div className="flex gap-2 w-full sm:w-auto print:hidden">
              {s.state === "due" && quote.status === "accepted" && (
                <Link
                  to={`/q/${token}/pay/${s.id}`}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: "var(--quote-cta)" }}
                >
                  Pay now
                </Link>
              )}
              {s.state !== "later" && (
                <Link
                  to={`/q/${token}/invoice/${s.id}`}
                  className="px-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  Invoice
                </Link>
              )}
              {s.receiptPath && (
                <Link
                  to={s.receiptPath}
                  className="px-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  Receipt
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
        Paid {formatMinor(quote.summary.paidMinor, quote.currency)} · Balance{" "}
        {formatMinor(quote.summary.balanceMinor, quote.currency)}
      </p>
    </QuoteCard>
  );
}
