import type React from "react";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import type { ClientQuote, MaintenanceSection, NeedsGroup, NeedsTables } from "@/types/quote";
import { formatMinor } from "@/utils/quoteMath";
import { parseNeeds } from "@/utils/needsList";
import { needsRowCount, visibleRows } from "@/utils/needsTables";

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

/** Lower-cases the first letter so the free-period text reads on after a colon. */
const continueSentence = (text: string) => {
  const t = text.trim();
  if (!t) return "";
  const body = /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
  return /[.!?]$/.test(body) ? body : `${body}.`;
};

/** The section's opening line, built from the free period and the plans' period. */
export function maintenanceIntro(m: MaintenanceSection): string {
  const parts: string[] = [];
  if (m.freeDays > 0) {
    const lead =
      m.freeDays === 1
        ? "The first day after launch is included free"
        : `The first ${m.freeDays} days after launch are included free`;
    const extra = continueSentence(m.freeText);
    parts.push(extra ? `${lead}: ${extra}` : `${lead}.`);
  }
  if (m.plans.length) {
    const periods = new Set(m.plans.map((p) => p.period));
    const kind =
      periods.size > 1
        ? "a plan"
        : m.plans[0].period === "year"
          ? "a yearly plan"
          : "a monthly plan";
    const sentence = `${kind} keeps the platform safe and up to date.`;
    parts.push(
      m.freeDays > 0
        ? `After that, ${sentence}`
        : `${sentence[0].toUpperCase()}${sentence.slice(1)}`,
    );
  }
  return parts.join(" ");
}

const PER = { month: "month", year: "year" } as const;

/**
 * "Maintenance and support": the free period after launch and the optional
 * paid plans as side-by-side cards. Hidden unless there is a free period or a
 * plan. Always open; each plan card keeps itself whole on a printed page.
 */
export function Maintenance({ quote }: { quote: ClientQuote }) {
  const m = quote.extras?.maintenance;
  if (!m || (m.freeDays <= 0 && !m.plans.length)) return null;
  return (
    <QuoteCard>
      <SectionLabel>Maintenance and support</SectionLabel>
      <p
        className="max-w-prose text-[15px] leading-relaxed break-words"
        style={{ color: "var(--text-secondary)" }}
      >
        {maintenanceIntro(m)}
      </p>
      {m.plans.length > 0 && (
        <>
          <ul className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
            {m.plans.map((p) => (
              <li
                key={p.id}
                className="flex min-w-0 flex-col rounded-xl border p-4 break-inside-avoid"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <h3
                  className="text-base font-semibold break-words"
                  style={{ color: "var(--text-primary)" }}
                >
                  {p.name}
                </h3>
                <p className="mt-1 break-words" style={{ color: "var(--text-secondary)" }}>
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatMinor(p.priceMinor, quote.currency)}
                  </span>
                  <span className="text-sm"> / {PER[p.period] ?? "month"}</span>
                </p>
                {p.includes.trim() && (
                  <div
                    className="mt-3 border-t pt-3 [&_ul]:text-sm"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <BulletLines text={p.includes} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Optional, and not part of the total above. You can start a plan after launch.
          </p>
        </>
      )}
      {m.note.trim() && (
        <p
          className="mt-2 max-w-prose text-sm leading-relaxed whitespace-pre-line break-words"
          style={{ color: "var(--text-secondary)" }}
        >
          {m.note}
        </p>
      )}
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

function NeedsHeading({ count }: { count: number }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 [&>h2]:mb-0">
      <SectionLabel>What I&apos;ll need from you</SectionLabel>
      <span
        className="rounded-full border px-2 py-0.5 text-xs font-medium"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
      >
        {count} {count === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

const cellCls =
  "min-w-0 align-top break-words [overflow-wrap:anywhere] sm:table-cell sm:py-3 sm:pr-4 sm:last:pr-0";

/**
 * One group as a table. On sm+ it is a real table (Item | detail | When); on
 * phones the same markup stacks each row: item, detail underneath, then the
 * "when" pill. Explicit roles keep the table semantics when rows display as
 * blocks. The When column is left out when no row has a time.
 */
function NeedsTable({ group }: { group: NeedsGroup }) {
  const hasWhen = group.rows.some((r) => r.when.trim());
  const thCls =
    "pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-[0.08em] last:pr-0 align-bottom";
  return (
    <table role="table" className="block w-full text-[15px] sm:table sm:table-fixed">
      {/* Explicit roles: the rows display as blocks on phones, which drops
          the implicit table semantics in some screen readers. */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- see above */}
      <thead role="rowgroup" className="sr-only sm:not-sr-only sm:table-header-group">
        <tr role="row" className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <th role="columnheader" scope="col" className={`${thCls} sm:w-[44%]`}>
            <span style={{ color: "var(--text-secondary)" }}>Item</span>
          </th>
          <th role="columnheader" scope="col" className={thCls}>
            <span style={{ color: "var(--text-secondary)" }}>{group.detailLabel}</span>
          </th>
          {hasWhen && (
            <th role="columnheader" scope="col" className={`${thCls} sm:w-44`}>
              <span style={{ color: "var(--text-secondary)" }}>When</span>
            </th>
          )}
        </tr>
      </thead>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- see the thead comment */}
      <tbody role="rowgroup" className="block sm:table-row-group">
        {group.rows.map((r) => (
          <tr
            key={r.id}
            role="row"
            className="block break-inside-avoid border-b py-3 last:border-b-0 sm:table-row sm:py-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <td
              role="cell"
              className={`${cellCls} block font-medium leading-snug`}
              style={{ color: "var(--text-primary)" }}
            >
              {r.item}
            </td>
            <td
              role="cell"
              className={`${cellCls} mt-0.5 text-sm leading-snug sm:mt-0 sm:text-[15px] ${r.detail ? "block" : "hidden"}`}
              style={{ color: "var(--text-secondary)" }}
            >
              {r.detail}
            </td>
            {hasWhen && (
              <td role="cell" className={`${cellCls} ${r.when ? "mt-2 block sm:mt-0" : "hidden"}`}>
                {r.when && (
                  <span
                    className="inline-block max-w-full rounded-full border px-2.5 py-0.5 text-xs font-medium leading-snug"
                    style={{ borderColor: "var(--border-subtle)", color: "var(--accent-teal)" }}
                  >
                    {r.when}
                  </span>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The grouped tables from `extras.needs`. Always open; rows never split across printed pages. */
function NeedsTablesCard({ needs }: { needs: NeedsTables }) {
  const groups = needs.groups
    .map((g) => ({ ...g, rows: visibleRows(g) }))
    .filter((g) => g.rows.length > 0);
  const count = groups.reduce((n, g) => n + g.rows.length, 0);
  return (
    // Long tables may run over a printed page; rows keep themselves whole instead.
    <QuoteCard className="print:![break-inside:auto]">
      <NeedsHeading count={count} />
      {needs.intro.trim() && (
        <p
          className="max-w-prose text-[15px] leading-relaxed whitespace-pre-line break-words"
          style={{ color: "var(--text-secondary)" }}
        >
          {needs.intro}
        </p>
      )}
      {groups.map((g) => (
        <div key={g.id} className="mt-6 min-w-0">
          <h3
            className="mb-1 text-base font-semibold break-words"
            style={{ color: "var(--text-primary)" }}
          >
            {g.title}
          </h3>
          {g.intro.trim() && (
            <p
              className="mb-2 max-w-prose text-sm leading-relaxed whitespace-pre-line break-words"
              style={{ color: "var(--text-secondary)" }}
            >
              {g.intro}
            </p>
          )}
          <div className="mt-2 min-w-0">
            <NeedsTable group={g} />
          </div>
          {g.footnote.trim() && (
            <p
              className="mt-3 break-inside-avoid border-l-2 pl-3 text-sm leading-relaxed whitespace-pre-line break-words"
              style={{ borderColor: "var(--accent-teal)", color: "var(--text-secondary)" }}
            >
              {g.footnote}
            </p>
          )}
        </div>
      ))}
    </QuoteCard>
  );
}

/**
 * What the client must send before work starts. Quotes with `extras.needs`
 * show grouped tables; older quotes fall back to the plain-text checklist in
 * `assumptions`. Printable and never folded.
 */
export function NeedsFromYou({ quote }: { quote: ClientQuote }) {
  const needs = quote.extras?.needs;
  if (needs && needsRowCount(needs) > 0) return <NeedsTablesCard needs={needs} />;
  return <LegacyNeeds text={quote.assumptions ?? ""} />;
}

function LegacyNeeds({ text }: { text: string }) {
  const { groups, count } = parseNeeds(text);
  if (!count) return null;
  return (
    <QuoteCard>
      <NeedsHeading count={count} />
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
