import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { TabHeader } from "@/components/ui/TabHeader";
import { ErrorBanner, RefreshControl, SelectField } from "../shared/controls";
import { BlogReadershipSection } from "./BlogReadershipSection";
import { RangePicker } from "./RangePicker";
import { useAnalyticsData } from "./useAnalyticsData";
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
import { RevenueSection } from "./sections/RevenueSection";
import { ExpensesSection } from "./sections/ExpensesSection";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };

const APPROX_OPTION = "approx";

const SECTIONS = [
  { id: "analytics-summary", label: "Summary" },
  { id: "analytics-revenue", label: "Revenue" },
  { id: "analytics-expenses", label: "Expenses" },
  { id: "analytics-content", label: "Content" },
] as const;

const storage = () => (typeof window === "undefined" ? undefined : window.localStorage);

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-4 space-y-3">
      <h2 id={`${id}-heading`} className="text-lg font-bold" style={strong}>
        {title}
      </h2>
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
  const { data, errors, loading, updatedAt, refresh, setExpenses } = useAnalyticsData();
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

  const errorText = Object.values(errors).filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
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

      <div className="glass-card space-y-3 rounded-xl p-4">
        <RangePicker
          key={`${choice.preset}-${choice.from ?? ""}-${choice.to ?? ""}`}
          choice={choice}
          range={range}
          previous={previous}
          onChange={setChoice}
          now={now}
        />
        <div className="flex flex-wrap items-center gap-3">
          <SelectField
            label="Charts in"
            value={unitValue}
            options={[
              ...currencies.map((c) => ({ value: c, label: c })),
              { value: APPROX_OPTION, label: "All currencies, approx. GHS" },
            ]}
            onChange={setUnitPick}
          />
          <p className="text-xs" style={muted}>
            Totals are shown in each currency. Combined GHS figures are approx., at reference
            exchange rates as of {formatDay(FX_RATES.asOf)}.
          </p>
        </div>
        <nav aria-label="Analytics sections">
          <ul className="flex flex-wrap gap-3 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="font-semibold underline-offset-2 hover:underline"
                  style={{ color: "var(--accent-teal)" }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Section id="analytics-summary" title="Summary">
        <SummarySection
          ledger={ledger}
          expenses={data.expenses}
          outstanding={outstanding}
          range={range}
          previous={previous}
          unit={unit}
          unitLabel={unitLabel}
          errors={errors}
        />
      </Section>

      <Section id="analytics-revenue" title="Revenue and payments">
        <RevenueSection
          ledger={ledger}
          outstanding={outstanding}
          range={range}
          bucket={bucket}
          unit={unit}
          unitLabel={unitLabel}
          loading={loading}
          errors={errors}
        />
      </Section>

      <Section id="analytics-expenses" title="Expenses in detail">
        <ExpensesSection
          expenses={data.expenses}
          setExpenses={setExpenses}
          range={range}
          bucket={bucket}
          unit={unit}
          unitLabel={unitLabel}
          loading={loading}
          error={errors.expenses}
        />
      </Section>

      <Section id="analytics-content" title="Content">
        <BlogReadershipSection theme={theme} />
      </Section>
    </div>
  );
}
