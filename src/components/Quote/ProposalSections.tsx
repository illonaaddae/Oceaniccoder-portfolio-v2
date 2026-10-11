import type React from "react";
import TextBlock from "./TextBlock";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import type { ClientQuote } from "@/types/quote";

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Small chevron that turns when its <details> is open (see `group-open` on the parent). */
function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

/** A native disclosure with a plain summary row and a chevron. */
export function Disclosure({
  summary,
  children,
  className = "",
  style,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <details className={`group ${className}`} style={style}>
      <summary
        className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden"
        style={{ color: "var(--text-primary)" }}
      >
        <span className="min-w-0 break-words">{summary}</span>
        <Chevron />
      </summary>
      <div className="mt-2 min-w-0 break-words">{children}</div>
    </details>
  );
}

/** Per-item "What it includes" disclosure. Returns null when there is no detail. */
export function ItemDetail({ detail }: { detail: string }) {
  if (!detail.trim()) return null;
  return (
    <Disclosure summary="What it includes" className="mt-1.5">
      <p
        className="block min-w-0 text-sm leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]"
        style={{ color: "var(--text-secondary)" }}
      >
        {detail}
      </p>
    </Disclosure>
  );
}

export function AtAGlance({ quote }: { quote: ClientQuote }) {
  const items = quote.highlights.map((h) => h.trim()).filter(Boolean);
  if (!items.length) return null;
  return (
    <QuoteCard>
      <SectionLabel>At a glance</SectionLabel>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((h, i) => (
          <li
            key={i}
            className="min-w-0 break-words rounded-xl border px-4 py-3 text-[15px] font-medium"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            {h}
          </li>
        ))}
      </ul>
    </QuoteCard>
  );
}

export function RunningCosts({ quote }: { quote: ClientQuote }) {
  if (!quote.runningCosts.length) return null;
  return (
    <QuoteCard>
      <SectionLabel>Running costs</SectionLabel>
      <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        These are paid to the providers after launch. They are not part of the price above.
      </p>
      <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {quote.runningCosts.map((c, i) => (
          <li
            key={i}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="min-w-0 break-words">
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                {c.service}
              </p>
              {c.purpose && (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {c.purpose}
                </p>
              )}
            </div>
            <p
              className="min-w-0 break-words text-sm tabular-nums sm:text-right sm:whitespace-nowrap"
              style={{ color: "var(--text-primary)" }}
            >
              {c.cost}
            </p>
          </li>
        ))}
      </ul>
    </QuoteCard>
  );
}

export function ScopeNotes({ quote }: { quote: ClientQuote }) {
  const exclusions = quote.exclusions.trim();
  const assumptions = quote.assumptions.trim();
  if (!exclusions && !assumptions) return null;
  const heading = "text-sm font-semibold mb-1";
  return (
    <QuoteCard>
      <Disclosure summary="Scope notes">
        <div className="space-y-4">
          {exclusions && (
            <div className="min-w-0 break-words">
              <p className={heading} style={{ color: "var(--text-primary)" }}>
                Not included
              </p>
              <TextBlock text={exclusions} />
            </div>
          )}
          {assumptions && (
            <div className="min-w-0 break-words">
              <p className={heading} style={{ color: "var(--text-primary)" }}>
                What I need from you
              </p>
              <TextBlock text={assumptions} />
            </div>
          )}
        </div>
      </Disclosure>
    </QuoteCard>
  );
}

export function NextSteps({ quote }: { quote: ClientQuote }) {
  const steps = lines(quote.nextSteps);
  if (!steps.length) return null;
  return (
    <QuoteCard>
      <SectionLabel>Next steps</SectionLabel>
      <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed">
        {steps.map((s, i) => (
          <li key={i} className="min-w-0 break-words" style={{ color: "var(--text-secondary)" }}>
            {s}
          </li>
        ))}
      </ol>
    </QuoteCard>
  );
}

export function OptionalExtras({
  quote,
  money,
}: {
  quote: ClientQuote;
  money: (minor: number) => string;
}) {
  if (!quote.optionalItems.length) return null;
  return (
    <QuoteCard className="border-dashed">
      <Disclosure
        summary={`${quote.optionalTitle.trim() || "Optional extras for later"} · Not in this quote`}
      >
        <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          {`Not included in the ${money(quote.totalMinor)} above, and not part of these payments. Ask for a separate quote when you're ready.`}
        </p>
        <ul className="divide-y">
          {quote.optionalItems.map((o) => (
            <li key={o.id} className="py-3 text-sm" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 break-words" style={{ color: "var(--text-primary)" }}>
                  {o.description}
                </span>
                <span
                  className="whitespace-nowrap tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {money(o.lineMinor)}
                </span>
              </div>
              <ItemDetail detail={o.detail} />
            </li>
          ))}
        </ul>
        <p
          className="mt-3 flex justify-between gap-4 text-sm font-semibold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          <span>Indicative total</span>
          <span>{money(quote.optionalTotalMinor)}</span>
        </p>
      </Disclosure>
    </QuoteCard>
  );
}
