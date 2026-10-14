import type React from "react";
import { useMemo } from "react";
import type { Expense } from "@/types";
import { formatMoney, type CurrencyTotals } from "../../shared/money";
import { ApproxLine, DeltaChip, InfoTip, Sparkline, leavesOut, unconverted } from "../KpiExtras";
import { delta, type Bucket, type DateRange, type Delta } from "../metrics/range";
import {
  cashByCurrency,
  cashSeries,
  entriesIn,
  expenseSeries,
  expenseTotals,
  expensesIn,
  netByCurrency,
  paymentStats,
  totalIn,
  type LedgerEntry,
  type MoneyUnit,
  type OutstandingSummary,
} from "../metrics/revenue";
import type { SourceErrors } from "../useAnalyticsData";

const sub: React.CSSProperties = { color: "var(--text-secondary)" };

interface SummarySectionProps {
  ledger: LedgerEntry[];
  expenses: Expense[];
  outstanding: OutstandingSummary;
  range: DateRange;
  previous: DateRange;
  bucket: Bucket;
  unit: MoneyUnit;
  unitLabel: string;
  errors: SourceErrors;
}

/** One figure on the band; its label names the group for screen readers. */
function Figure({
  label,
  info,
  children,
}: {
  label: string;
  info: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" className="analytics-hero__fig" aria-label={label}>
      <div className="flex items-center gap-1">
        <h3 className="text-sm font-semibold">{label}</h3>
        <InfoTip label={`About ${label.toLowerCase()}`}>{info}</InfoTip>
      </div>
      {children}
    </div>
  );
}

/** The first currency large, any others smaller under it. */
function Totals({ totals }: { totals: CurrencyTotals }) {
  if (totals.length === 0)
    return <p className="text-[28px] font-extrabold leading-tight tabular-nums">0.00</p>;
  return (
    <ul className="min-w-0">
      {totals.map((t, i) => (
        <li
          key={t.currency}
          className={
            i === 0
              ? "text-[28px] font-extrabold leading-tight tabular-nums"
              : "text-base font-bold tabular-nums"
          }
        >
          {formatMoney(t.amount, t.currency)}
        </li>
      ))}
    </ul>
  );
}

function Headline({ totals, chip }: { totals: CurrencyTotals; chip: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <Totals totals={totals} />
      <span className="mt-1.5 shrink-0">{chip}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs tabular-nums" style={sub}>
      {children}
    </p>
  );
}

/** "vs previous period (GHS)", naming any currency the approx. delta leaves out. */
function Compared({
  lead,
  unitLabel,
  missing,
}: {
  lead: string;
  unitLabel: string;
  missing: string[];
}) {
  return (
    <Note>
      {lead}
      <span aria-hidden="true">
        {" · "}vs previous period ({unitLabel})
      </span>
      {missing.length > 0 && ` ${leavesOut(missing)}`}
    </Note>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The money headline for the range on the ocean band: collected, owed, spent and net. */
export function SummarySection({
  ledger,
  expenses,
  outstanding,
  range,
  previous,
  bucket,
  unit,
  unitLabel,
  errors,
}: SummarySectionProps) {
  const figures = useMemo(() => {
    const inRange = entriesIn(ledger, range);
    const cash = cashByCurrency(inRange);
    const cashBefore = cashByCurrency(entriesIn(ledger, previous));
    const spentIn = expensesIn(expenses, range);
    const spent = expenseTotals(spentIn);
    const spentBefore = expenseTotals(expensesIn(expenses, previous));
    const net = netByCurrency(cash, spent);
    const netBefore = netByCurrency(cashBefore, spentBefore);
    const cashLine = cashSeries(ledger, range, unit, bucket).map((p) => p.total);
    const spentLine = expenseSeries(expenses, range, unit, bucket).map((p) => p.amount);
    const stats = paymentStats(inRange);
    return {
      cash,
      spent,
      net,
      cashLine,
      spentLine,
      netLine: cashLine.map((c, i) => c - (spentLine[i] ?? 0)),
      // "2 GHS (avg GHS 275.00), 1 USD (avg USD 100.00)"
      cashNote:
        stats.length > 0
          ? stats
              .map((s) => `${s.count} ${s.currency} (avg ${formatMoney(s.average, s.currency)})`)
              .join(", ")
          : "No payments",
      spentNote: plural(spentIn.length, "expense", "expenses"),
      cashMissing: unconverted(unit, cash, cashBefore),
      spentMissing: unconverted(unit, spent, spentBefore),
      netMissing: unconverted(unit, net, netBefore),
      cashDelta: delta(totalIn(unit, cash), totalIn(unit, cashBefore)),
      spentDelta: delta(totalIn(unit, spent), totalIn(unit, spentBefore)),
      netDelta: delta(totalIn(unit, net), totalIn(unit, netBefore)),
    };
  }, [ledger, expenses, range, previous, bucket, unit]);

  const chip = (d: Delta, upIsGood = true) => (
    <DeltaChip delta={d} unitLabel={unitLabel} upIsGood={upIsGood} />
  );

  const owedNote =
    errors.invoices || errors.quotes
      ? `Leaves out ${[errors.invoices && "one-off invoices", errors.quotes && "quote stages"]
          .filter(Boolean)
          .join(" and ")}: they couldn't load.`
      : null;

  return (
    <div className="analytics-hero">
      <div className="analytics-hero__grid">
        <Figure
          label="Cash collected"
          info="Successful invoice and quote payments in the range, dated when the money arrived."
        >
          {errors.payments ? (
            <Note>Payments couldn&rsquo;t load.</Note>
          ) : (
            <>
              <Headline totals={figures.cash} chip={chip(figures.cashDelta)} />
              <Sparkline values={figures.cashLine} />
              <Compared
                lead={figures.cashNote}
                unitLabel={unitLabel}
                missing={figures.cashMissing}
              />
              <ApproxLine totals={figures.cash} />
              {errors.invoices && (
                <Note>
                  Leaves out paid invoices with no payment record: invoices couldn&rsquo;t load.
                </Note>
              )}
            </>
          )}
        </Figure>
        <Figure
          label="Owed to you"
          info="Sent invoices and requested quote stages that aren't paid yet. Today's position, whatever the range."
        >
          <Headline
            totals={outstanding.totals}
            chip={<span className="analytics-chip">Now</span>}
          />
          <Note>
            {plural(outstanding.items.length, "invoice", "invoices")}, {outstanding.overdueCount}{" "}
            overdue. Not limited to the range.
          </Note>
          <ApproxLine totals={outstanding.totals} />
          {owedNote && <Note>{owedNote}</Note>}
        </Figure>
        <Figure
          label="Expenses"
          info="Expenses dated in the range. Lower than the previous period shows as good."
        >
          {errors.expenses ? (
            <Note>Expenses couldn&rsquo;t load.</Note>
          ) : (
            <>
              <Headline totals={figures.spent} chip={chip(figures.spentDelta, false)} />
              <Sparkline values={figures.spentLine} />
              <Compared
                lead={figures.spentNote}
                unitLabel={unitLabel}
                missing={figures.spentMissing}
              />
              <ApproxLine totals={figures.spent} />
            </>
          )}
        </Figure>
        <Figure label="Net" info="Cash collected minus expenses, in each currency.">
          {errors.payments || errors.expenses ? (
            <Note>
              Needs {errors.payments ? "payments" : "expenses"}, which couldn&rsquo;t load.
            </Note>
          ) : (
            <>
              <Headline totals={figures.net} chip={chip(figures.netDelta)} />
              <Sparkline values={figures.netLine} />
              <Compared
                lead="Collected minus expenses"
                unitLabel={unitLabel}
                missing={figures.netMissing}
              />
              <ApproxLine totals={figures.net} />
            </>
          )}
        </Figure>
      </div>
    </div>
  );
}
