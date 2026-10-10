import TextBlock from "./TextBlock";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import type { ClientQuote } from "@/types/quote";

export default function QuoteDocument({ quote }: { quote: ClientQuote }) {
  const money = (m: number) => formatMinor(m, quote.currency);
  const sections = [
    ["Overview", quote.overview],
    ["Scope and deliverables", quote.scope],
    ["Timeline", quote.timeline],
  ].filter(([, text]) => text.trim());

  return (
    <>
      <section className="rounded-2xl p-6 sm:p-8 text-white bg-[linear-gradient(135deg,#04333B_0%,#0a0f1a_100%)] print:bg-none print:text-black print:border print:border-gray-300">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7dd3e0] print:text-gray-600">
              Quote {quote.quoteNumber}
              {quote.revision > 1 ? ` · revision ${quote.revision}` : ""}
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mt-2">{quote.title}</h1>
          </div>
          <div className="text-right font-mono text-sm">
            <p className="text-white/60 print:text-gray-600">Total</p>
            <p className="text-2xl font-bold tabular-nums">{money(quote.totalMinor)}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
          <div>
            <dt className="text-white/60 print:text-gray-600">Prepared for</dt>
            <dd className="font-medium">
              {quote.clientName}
              {quote.clientCompany ? `, ${quote.clientCompany}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-white/60 print:text-gray-600">Issued</dt>
            <dd className="font-medium">{formatDate(quote.issuedAt) || "Draft"}</dd>
          </div>
          <div>
            <dt className="text-white/60 print:text-gray-600">Valid until</dt>
            <dd className="font-medium">{formatDate(quote.validUntil) || "Not set"}</dd>
          </div>
        </dl>
      </section>

      {sections.map(([label, text]) => (
        <QuoteCard key={label}>
          <SectionLabel>{label}</SectionLabel>
          <TextBlock text={text} />
        </QuoteCard>
      ))}

      <QuoteCard>
        <SectionLabel>What's included</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-secondary)" }}>
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium text-right hidden sm:table-cell">Qty</th>
              <th className="py-2 font-medium text-right hidden sm:table-cell">Unit price</th>
              <th className="py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr
                key={item.id}
                className="border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <td className="py-3 pr-3" style={{ color: "var(--text-primary)" }}>
                  {item.description}
                  <span
                    className="block sm:hidden text-xs font-mono mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.qty} × {money(item.unitMinor)}
                  </span>
                </td>
                <td className="py-3 text-right font-mono tabular-nums hidden sm:table-cell">
                  {item.qty}
                </td>
                <td className="py-3 text-right font-mono tabular-nums hidden sm:table-cell">
                  {money(item.unitMinor)}
                </td>
                <td
                  className="py-3 text-right font-mono tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {money(item.lineMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 ml-auto max-w-xs text-sm font-mono tabular-nums space-y-1">
          <div className="flex justify-between">
            <dt style={{ color: "var(--text-secondary)" }}>Subtotal</dt>
            <dd>{money(quote.subtotalMinor)}</dd>
          </div>
          {quote.discountMinor > 0 && (
            <div className="flex justify-between">
              <dt style={{ color: "var(--text-secondary)" }}>Discount</dt>
              <dd>−{money(quote.discountMinor)}</dd>
            </div>
          )}
          <div
            className="flex justify-between border-t-2 pt-2 text-base font-bold"
            style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}
          >
            <dt>Total</dt>
            <dd>{money(quote.totalMinor)}</dd>
          </div>
        </dl>
      </QuoteCard>
    </>
  );
}

export function TermsAndNotes({ quote }: { quote: ClientQuote }) {
  return (
    <>
      {quote.notes.trim() && (
        <QuoteCard>
          <SectionLabel>Notes</SectionLabel>
          <TextBlock text={quote.notes} />
        </QuoteCard>
      )}
      {quote.terms.trim() && (
        <QuoteCard>
          <SectionLabel>Terms</SectionLabel>
          <TextBlock text={quote.terms} />
        </QuoteCard>
      )}
    </>
  );
}
