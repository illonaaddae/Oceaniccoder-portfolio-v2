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
      <section className="quote-on-dark rounded-2xl p-6 sm:p-8 bg-[linear-gradient(135deg,#04333B_0%,#085866_100%)] print:bg-none print:border print:border-gray-300">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#8dd7e7] print:text-gray-600">
              Quote {quote.quoteNumber}
              {quote.revision > 1 ? ` · revision ${quote.revision}` : ""}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2 leading-tight">{quote.title}</h1>
          </div>
          <div className="sm:text-right shrink-0">
            <p className="text-sm text-white/75 print:text-gray-600">Total</p>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">{money(quote.totalMinor)}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 mt-6 pt-6 border-t border-white/15 text-sm print:border-gray-300">
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-white/75 print:text-gray-600">Prepared for</dt>
            <dd className="font-semibold mt-0.5">
              {quote.clientName}
              {quote.clientCompany ? `, ${quote.clientCompany}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-white/75 print:text-gray-600">Issued</dt>
            <dd className="font-semibold mt-0.5">{formatDate(quote.issuedAt) || "Draft"}</dd>
          </div>
          <div>
            <dt className="text-white/75 print:text-gray-600">Valid until</dt>
            <dd className="font-semibold mt-0.5">{formatDate(quote.validUntil) || "Not set"}</dd>
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
                    className="block sm:hidden text-xs mt-1 tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.qty} × {money(item.unitMinor)}
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums hidden sm:table-cell">{item.qty}</td>
                <td className="py-3 text-right tabular-nums hidden sm:table-cell">
                  {money(item.unitMinor)}
                </td>
                <td
                  className="py-3 pl-3 text-right tabular-nums whitespace-nowrap"
                  style={{ color: "var(--text-primary)" }}
                >
                  {money(item.lineMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 ml-auto max-w-xs text-sm tabular-nums space-y-1">
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
