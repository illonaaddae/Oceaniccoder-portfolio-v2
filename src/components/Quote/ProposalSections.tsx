import type React from "react";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import type { ClientQuote } from "@/types/quote";
import { parseNeeds } from "@/utils/needsList";

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
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
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

/** Strip a leading "-", "•" or "*" marker so notes written either way read the same. */
const stripMarker = (l: string) => l.replace(/^[-•*]\s*/, "");

/** One tight bullet per non-empty line, matching the bullets in TextBlock. */
function BulletLines({ text }: { text: string }) {
  const items = lines(text).map(stripMarker).filter(Boolean);
  return (
    <ul
      className="list-disc pl-5 space-y-1 text-[15px] leading-snug"
      style={{ color: "var(--text-secondary)" }}
    >
      {items.map((l, i) => (
        <li key={i} className="min-w-0 break-words">
          {l}
        </li>
      ))}
    </ul>
  );
}

export function ScopeNotes({ quote }: { quote: ClientQuote }) {
  const exclusions = quote.exclusions.trim();
  if (!exclusions) return null;
  return (
    <QuoteCard>
      <SectionLabel>Not included</SectionLabel>
      <div className="min-w-0 break-words">
        <BulletLines text={exclusions} />
      </div>
    </QuoteCard>
  );
}

/** What the client must send before work starts, as an open checklist (printable, never folded). */
export function NeedsFromYou({ quote }: { quote: ClientQuote }) {
  const { groups, count } = parseNeeds(quote.assumptions);
  if (!count) return null;
  return (
    <QuoteCard>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 [&>h2]:mb-0">
        <SectionLabel>What I&apos;ll need from you</SectionLabel>
        <span
          className="rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
        >
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      <p className="mb-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        Send these by email or WhatsApp when you can. Work on each part starts once its items
        arrive.
      </p>
      {groups.map((g, gi) => (
        <div key={gi} className="min-w-0">
          {g.heading && (
            <h3
              className="mt-4 mb-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {g.heading}
            </h3>
          )}
          <ul className="space-y-2.5 pt-1.5">
            {g.items.map((it, i) => (
              <li key={i} className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden
                  className="mt-[3px] h-4 w-4 shrink-0 rounded-full border-2"
                  style={{ borderColor: "var(--quote-cta, var(--accent-teal))" }}
                />
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <p className="text-[15px] leading-snug" style={{ color: "var(--text-primary)" }}>
                    {it.text}
                  </p>
                  {it.note && (
                    <p className="text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>
                      {it.note}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </QuoteCard>
  );
}

export function NextSteps({ quote }: { quote: ClientQuote }) {
  const steps = lines(quote.nextSteps);
  if (!steps.length) return null;
  return (
    <QuoteCard>
      <SectionLabel>Next steps</SectionLabel>
      <ol className="list-decimal space-y-1 pl-5 text-[15px] leading-snug">
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
