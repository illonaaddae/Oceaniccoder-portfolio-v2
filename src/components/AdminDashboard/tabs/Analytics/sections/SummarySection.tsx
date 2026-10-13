import type React from "react";
import { useMemo } from "react";
import type { Expense } from "@/types";
import { KpiCard, MoneyTotals, CountWithTotals } from "../../shared/KpiCard";
import { ApproxLine, DeltaLine, unconverted } from "../KpiExtras";
import { delta, type DateRange } from "../metrics/range";
import {
  cashByCurrency,
  entriesIn,
  expenseTotals,
  expensesIn,
  netByCurrency,
  totalIn,
  type LedgerEntry,
  type MoneyUnit,
  type OutstandingSummary,
} from "../metrics/revenue";
import type { SourceErrors } from "../useAnalyticsData";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };

interface SummarySectionProps {
  ledger: LedgerEntry[];
  expenses: Expense[];
  outstanding: OutstandingSummary;
  range: DateRange;
  previous: DateRange;
  unit: MoneyUnit;
  unitLabel: string;
  errors: SourceErrors;
}

function Unavailable({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-sm" style={muted}>
      {children}
    </p>
  );
}

/** The money headline for the range: collected, owed, spent and net. */
export function SummarySection({
  ledger,
  expenses,
  outstanding,
  range,
  previous,
  unit,
  unitLabel,
  errors,
}: SummarySectionProps) {
  const figures = useMemo(() => {
    const cash = cashByCurrency(entriesIn(ledger, range));
    const cashBefore = cashByCurrency(entriesIn(ledger, previous));
    const spent = expenseTotals(expensesIn(expenses, range));
    const spentBefore = expenseTotals(expensesIn(expenses, previous));
    const net = netByCurrency(cash, spent);
    const netBefore = netByCurrency(cashBefore, spentBefore);
    return {
      cash,
      spent,
      net,
      cashMissing: unconverted(unit, cash, cashBefore),
      spentMissing: unconverted(unit, spent, spentBefore),
      netMissing: unconverted(unit, net, netBefore),
      cashDelta: delta(totalIn(unit, cash), totalIn(unit, cashBefore)),
      spentDelta: delta(totalIn(unit, spent), totalIn(unit, spentBefore)),
      netDelta: delta(totalIn(unit, net), totalIn(unit, netBefore)),
    };
  }, [ledger, expenses, range, previous, unit]);

  const owedNote =
    errors.invoices || errors.quotes
      ? `Leaves out ${[errors.invoices && "one-off invoices", errors.quotes && "quote stages"]
          .filter(Boolean)
          .join(" and ")}: they couldn't load.`
      : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Cash collected">
        {errors.payments ? (
          <Unavailable>Payments couldn&rsquo;t load.</Unavailable>
        ) : (
          <>
            <MoneyTotals totals={figures.cash} />
            <ApproxLine totals={figures.cash} />
            <DeltaLine
              delta={figures.cashDelta}
              unitLabel={unitLabel}
              missing={figures.cashMissing}
            />
            {errors.invoices && (
              <p className="mt-1 text-xs" style={muted}>
                Leaves out paid invoices with no payment record: invoices couldn&rsquo;t load.
              </p>
            )}
          </>
        )}
      </KpiCard>
      <KpiCard label="Owed to you now">
        <CountWithTotals
          count={outstanding.items.length}
          noun={["invoice", "invoices"]}
          totals={outstanding.totals}
        />
        <ApproxLine totals={outstanding.totals} />
        <p className="mt-1 text-xs" style={muted}>
          {outstanding.overdueCount} overdue. Not limited to the range.
        </p>
        {owedNote && (
          <p className="mt-1 text-xs" style={muted}>
            {owedNote}
          </p>
        )}
      </KpiCard>
      <KpiCard label="Expenses">
        {errors.expenses ? (
          <Unavailable>Expenses couldn&rsquo;t load.</Unavailable>
        ) : (
          <>
            <MoneyTotals totals={figures.spent} />
            <ApproxLine totals={figures.spent} />
            <DeltaLine
              delta={figures.spentDelta}
              unitLabel={unitLabel}
              upIsGood={false}
              missing={figures.spentMissing}
            />
          </>
        )}
      </KpiCard>
      <KpiCard label="Net (collected minus expenses)">
        {errors.payments || errors.expenses ? (
          <Unavailable>
            Needs {errors.payments ? "payments" : "expenses"}, which couldn&rsquo;t load.
          </Unavailable>
        ) : (
          <>
            <MoneyTotals totals={figures.net} />
            <ApproxLine totals={figures.net} />
            <DeltaLine
              delta={figures.netDelta}
              unitLabel={unitLabel}
              missing={figures.netMissing}
            />
          </>
        )}
      </KpiCard>
    </div>
  );
}
