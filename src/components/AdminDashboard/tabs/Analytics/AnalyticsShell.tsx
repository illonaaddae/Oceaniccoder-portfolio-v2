import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { TabHeader } from "@/components/ui/TabHeader";
import { ErrorBanner, RefreshControl, SelectField } from "../shared/controls";
import { BlogReadershipSection } from "./BlogReadershipSection";
import { InfoTip } from "./KpiExtras";
import { RangePicker } from "./RangePicker";
import { useAnalyticsData, type Source } from "./useAnalyticsData";
import { formatDay } from "./metrics/format";
import { FX_RATES } from "@/config/fxRates";
import {
  bucketFor,
  loadRangeChoice,
  previousRange,
  resolveRange,
  saveRangeChoice,
  todayUTC,
  type RangeChoice,
} from "./metrics/range";
import {
  buildLedger,
  defaultCurrency,
  outstandingSummary,
  type MoneyUnit,
} from "./metrics/revenue";
import { SummarySection } from "./sections/SummarySection";
import { OWED_CARD_ID, RevenueSection } from "./sections/RevenueSection";
import { ExpensesSection } from "./sections/ExpensesSection";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };

const APPROX_OPTION = "approx";

const SECTIONS = [
  { id: "analytics-revenue", label: "Revenue" },
  { id: OWED_CARD_ID, label: "Owed" },
  { id: "analytics-expenses", label: "Expenses" },
  { id: "analytics-content", label: "Content" },
] as const;

const SOURCE_NAMES: Record<Source, string> = {
  payments: "Payments",
  invoices: "Invoices",
  quotes: "Quotes",
  expenses: "Expenses",
};

const storage = () => (typeof window === "undefined" ? undefined : window.localStorage);

function Section({
  id,
  title,
  info,
  children,
}: {
  id: string;
  title: string;
  /** A how-it's-counted note behind an ⓘ next to the heading. */
  info?: { label: string; text: string };
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="space-y-3">
      <div className="flex items-center gap-1.5" style={muted}>
        <h2 id={`${id}-heading`} className="text-lg font-extrabold" style={strong}>
          {title}
        </h2>
        {info && <InfoTip label={info.label}>{info.text}</InfoTip>}
      </div>
      {children}
    </section>
  );
}

interface AnalyticsShellProps {
  theme: "light" | "dark";
  /** Injectable clock for tests. */
  now?: Date;
}

/** The Analytics tab: range and currency controls over the money sections. */
export default function AnalyticsShell({ theme, now }: AnalyticsShellProps) {
  const { data, errors, loaded, loading, updatedAt, refresh, setExpenses } = useAnalyticsData();
  const [choice, setChoice] = useState<RangeChoice>(() => loadRangeChoice(storage(), now));
  const [unitPick, setUnitPick] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => saveRangeChoice(storage(), choice), [choice]);
  // A new load brings new errors to show.
  useEffect(() => setDismissed(false), [updatedAt]);

  // Presets end today; keyed on the day so the range only changes when it does.
  const today = todayUTC(now);
  const range = useMemo(
    () => resolveRange(choice, new Date(`${today}T12:00:00Z`)),
    [choice, today],
  );
  const previous = useMemo(() => previousRange(range), [range]);
  const bucket = bucketFor(range);

  const ledger = useMemo(() => buildLedger(data.payments, data.invoices), [data]);
  const outstanding = useMemo(
    () => outstandingSummary(data.invoices, data.quotes, now ?? updatedAt ?? new Date()),
    [data, now, updatedAt],
  );

  const currencies = useMemo(() => {
    const set = new Set<string>(["GHS"]);
    for (const e of ledger) set.add(e.currency);
    for (const e of data.expenses) set.add(e.currency);
    for (const t of outstanding.totals) set.add(t.currency);
    return [...set].filter(Boolean).sort();
  }, [ledger, data.expenses, outstanding]);

  const unitValue = unitPick ?? defaultCurrency(ledger, range);
  const unit = useMemo<MoneyUnit>(
    () =>
      unitValue === APPROX_OPTION ? { kind: "approx" } : { kind: "currency", currency: unitValue },
    [unitValue],
  );
  const unitLabel = unit.kind === "approx" ? "approx. GHS" : unit.currency;

  // One sentence per source, e.g. "Invoices couldn't load (Network down)."
  const errorText = (Object.keys(SOURCE_NAMES) as Source[])
    .filter((source) => errors[source])
    .map((source) => `${SOURCE_NAMES[source]} couldn't load (${errors[source]}).`)
    .join(" ");

  return (
    <div className="analytics-dash space-y-6">
      <TabHeader
        theme={theme}
        title="Analytics"
        subtitle="Money in and out over the range you choose."
        customAction={
          <RefreshControl
            updatedAt={updatedAt}
            stale={Boolean(errorText)}
            loading={loading}
            onRefresh={() => void refresh()}
          />
        }
      />

      {errorText && !dismissed && (
        <ErrorBanner message={errorText} onDismiss={() => setDismissed(true)} />
      )}

      <div
        role="region"
        aria-label="Range and currency"
        className="analytics-filters flex flex-wrap items-center gap-x-3.5 gap-y-2"
      >
        <RangePicker
          key={`${choice.preset}-${choice.from ?? ""}-${choice.to ?? ""}`}
          choice={choice}
          range={range}
          previous={previous}
          onChange={setChoice}
          now={now}
        />
        <div className="flex items-center gap-1" style={muted}>
          <SelectField
            label="Show in"
            value={unitValue}
            options={[
              ...currencies.map((c) => ({ value: c, label: c })),
              { value: APPROX_OPTION, label: "All, approx. GHS" },
            ]}
            onChange={setUnitPick}
          />
          <InfoTip label="About days and currencies">
            Days are UTC (Ghana time). Totals are shown in each currency. Combined GHS figures are
            approx., at reference exchange rates as of {formatDay(FX_RATES.asOf)}.
          </InfoTip>
        </div>
        <nav aria-label="Analytics sections" className="md:ml-auto">
          <ul className="-ml-2 flex flex-wrap gap-1 text-[13px] md:ml-0">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="rounded-lg px-2 py-1 font-semibold hover:bg-[var(--analytics-line-soft)]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <section id="analytics-summary" aria-labelledby="analytics-summary-heading">
        <h2 id="analytics-summary-heading" className="sr-only">
          Key figures
        </h2>
        <SummarySection
          ledger={ledger}
          expenses={data.expenses}
          outstanding={outstanding}
          range={range}
          previous={previous}
          bucket={bucket}
          unit={unit}
          unitLabel={unitLabel}
          errors={errors}
          loaded={loaded}
        />
      </section>

      <Section
        id="analytics-revenue"
        title="Revenue and payments"
        info={{
          label: "How revenue is counted",
          text: "Successful payments on invoices and quotes, dated when the money arrived. Failed, pending, abandoned, duplicate and refunded attempts don't count.",
        }}
      >
        <RevenueSection
          ledger={ledger}
          outstanding={outstanding}
          range={range}
          bucket={bucket}
          unit={unit}
          unitLabel={unitLabel}
          loaded={loaded}
          errors={errors}
        />
      </Section>

      <Section id="analytics-expenses" title="Expenses">
        <ExpensesSection
          expenses={data.expenses}
          setExpenses={setExpenses}
          range={range}
          bucket={bucket}
          unit={unit}
          unitLabel={unitLabel}
          loaded={loaded.expenses}
          error={errors.expenses}
          theme={theme}
        />
      </Section>

      <Section id="analytics-content" title="Content">
        <BlogReadershipSection theme={theme} />
      </Section>
    </div>
  );
}
