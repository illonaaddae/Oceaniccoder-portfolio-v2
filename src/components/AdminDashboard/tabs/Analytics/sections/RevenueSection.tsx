import type React from "react";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "../../shared/KpiCard";
import { formatMoney } from "../../shared/money";
import { BreakdownTable } from "../BreakdownTable";
import { CHART_COLORS, ChartCard, axisTick, legendLabel, tooltipStyle } from "../ChartCard";
import { compactNumber, formatDay } from "../metrics/format";
import { dayOf, inRange, type Bucket, type DateRange } from "../metrics/range";
import {
  amountIn,
  byMethod,
  cashSeries,
  entriesIn,
  estimatedCount,
  paymentStats,
  topClients,
  unitCurrency,
  type CashPoint,
  type LedgerEntry,
  type MoneyUnit,
  type OutstandingSummary,
} from "../metrics/revenue";
import type { SourceErrors } from "../useAnalyticsData";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };
const cell = "py-2 pr-3";
const headCell = "py-2 pr-3 text-left text-xs font-semibold uppercase";

const OUTSTANDING_SHOWN = 10;

interface RevenueSectionProps {
  ledger: LedgerEntry[];
  outstanding: OutstandingSummary;
  range: DateRange;
  bucket: Bucket;
  unit: MoneyUnit;
  unitLabel: string;
  loading: boolean;
  errors: SourceErrors;
}

/** Revenue and payments for the range, plus what is owed now. */
export function RevenueSection({
  ledger,
  outstanding,
  range,
  bucket,
  unit,
  unitLabel,
  loading,
  errors,
}: RevenueSectionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const currency = unitCurrency(unit);
  const approx = unit.kind === "approx";
  const money = (amount: number) => `${approx ? "≈ " : ""}${formatMoney(amount, currency)}`;

  const inRangeEntries = useMemo(() => entriesIn(ledger, range), [ledger, range]);
  const series = useMemo(
    () => cashSeries(ledger, range, unit, bucket),
    [ledger, range, unit, bucket],
  );
  const stats = useMemo(() => paymentStats(inRangeEntries), [inRangeEntries]);
  const methods = useMemo(() => byMethod(inRangeEntries, unit), [inRangeEntries, unit]);
  const clients = useMemo(() => topClients(inRangeEntries, unit), [inRangeEntries, unit]);
  const estimated = estimatedCount(ledger);

  // A selected bucket that's no longer on the chart (new range) shows nothing.
  const point = series.find((p) => p.key === selected) ?? null;
  const drill = point
    ? inRangeEntries
        .filter(
          (e) => inRange(dayOf(e.date), point) && amountIn(unit, e.amount, e.currency) !== null,
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const hasCash = series.some((p) => p.total > 0 || p.previous > 0);
  const count = inRangeEntries.length;

  const toggle = (key: string) => setSelected((cur) => (cur === key ? null : key));

  const table = (
    <table className="w-full text-sm">
      <caption className="sr-only">Cash collected per period, {unitLabel}</caption>
      <thead>
        <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <th scope="col" className={headCell} style={muted}>
            Period
          </th>
          <th scope="col" className={`${headCell} text-right`} style={muted}>
            Invoices
          </th>
          <th scope="col" className={`${headCell} text-right`} style={muted}>
            Quotes
          </th>
          <th scope="col" className={`${headCell} text-right`} style={muted}>
            Total
          </th>
          <th scope="col" className={`${headCell} text-right`} style={muted}>
            Previous period
          </th>
          <th scope="col" className={headCell}>
            <span className="sr-only">Payments</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {series.map((p) => (
          <tr key={p.key} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <th scope="row" className={`${cell} text-left font-medium`} style={strong}>
              {p.label}
            </th>
            <td className={`${cell} text-right tabular-nums`} style={strong}>
              {money(p.invoice)}
            </td>
            <td className={`${cell} text-right tabular-nums`} style={strong}>
              {money(p.quote)}
            </td>
            <td className={`${cell} text-right tabular-nums`} style={strong}>
              {money(p.total)}
            </td>
            <td className={`${cell} text-right tabular-nums`} style={muted}>
              {money(p.previous)}
            </td>
            <td className={cell}>
              {p.total > 0 && (
                <button
                  type="button"
                  onClick={() => toggle(p.key)}
                  className="text-xs font-semibold underline-offset-2 hover:underline"
                  style={{ color: "var(--accent-teal)" }}
                >
                  {`${selected === p.key ? "Hide" : "Show"} payments for ${p.label}`}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard label="Payments received">
          <p className="mt-1 text-xl font-bold" style={strong}>
            {count} {count === 1 ? "payment" : "payments"}
          </p>
          {stats.map((s) => (
            <p key={s.currency} className="text-sm tabular-nums" style={muted}>
              {s.count} in {s.currency}, average {formatMoney(s.average, s.currency)}
            </p>
          ))}
        </KpiCard>
        <KpiCard label="How revenue is counted">
          <p className="mt-1 text-sm" style={muted}>
            Successful payments on invoices and quotes, dated when the money arrived. Failed,
            pending, abandoned, duplicate and refunded attempts don&rsquo;t count.
          </p>
          {estimated > 0 && (
            <p className="mt-2 text-sm" style={{ color: "var(--status-pending-text)" }}>
              {estimated} paid {estimated === 1 ? "invoice has" : "invoices have"} no payment
              record, so {estimated === 1 ? "its date is" : "their dates are"} estimated from the
              invoice&rsquo;s last update. Run <code>scripts/backfill-payments.mjs</code> to fix.
            </p>
          )}
        </KpiCard>
      </div>

      <ChartCard
        title="Cash collected over time"
        description={`Money received per ${bucket} in ${unitLabel}, split into invoice and quote payments. The dashed line is the same slot of the previous period. Choose a bar, or a row in the table, to list its payments.`}
        loading={loading && ledger.length === 0}
        error={errors.payments ? `Payments couldn't load: ${errors.payments}` : null}
        empty={hasCash ? null : `No payments in ${unitLabel} in this range or the one before.`}
        table={table}
        footer={
          point && <PaymentList point={point} entries={drill} onClose={() => toggle(point.key)} />
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={series}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            title="Cash collected over time"
          >
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              minTickGap={12}
            />
            <YAxis
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => compactNumber(v)}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--accent-teal-subtle)" }}
              formatter={(value, name) => [money(Number(value) || 0), String(name)]}
            />
            <Legend formatter={legendLabel} />
            <Bar
              dataKey="invoice"
              name="Invoices"
              stackId="cash"
              fill={CHART_COLORS.primary}
              maxBarSize={48}
              cursor="pointer"
              onClick={(d: { payload?: CashPoint }) => d.payload && toggle(d.payload.key)}
            />
            <Bar
              dataKey="quote"
              name="Quotes"
              stackId="cash"
              fill={CHART_COLORS.secondary}
              // The light fill is under 3:1 on white; the outline keeps the shape visible.
              stroke={CHART_COLORS.primary}
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
              cursor="pointer"
              onClick={(d: { payload?: CashPoint }) => d.payload && toggle(d.payload.key)}
            />
            <Line
              dataKey="previous"
              name="Previous period"
              type="monotone"
              stroke={CHART_COLORS.previous}
              strokeDasharray="5 4"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="By payment method"
          description={`Money received in the range by method, in ${unitLabel}.`}
          loading={loading && ledger.length === 0}
          error={errors.payments ? "Payments couldn't load." : null}
        >
          <BreakdownTable
            caption="Money received by payment method"
            keyHeader="Method"
            rows={methods}
            currency={currency}
            approx={approx}
            empty="No payments in this range."
          />
        </ChartCard>
        <ChartCard
          title="Top clients"
          description={`The ten clients who paid the most in the range, in ${unitLabel}.`}
          loading={loading && ledger.length === 0}
          error={errors.payments ? "Payments couldn't load." : null}
        >
          <BreakdownTable
            caption="Top clients by money received"
            keyHeader="Client"
            rows={clients}
            currency={currency}
            approx={approx}
            empty="No payments in this range."
          />
        </ChartCard>
      </div>

      <OutstandingCard outstanding={outstanding} loading={loading} />
    </div>
  );
}

/** The payments in one chart bucket, each in its own currency. */
function PaymentList({
  point,
  entries,
  onClose,
}: {
  point: CashPoint;
  entries: LedgerEntry[];
  onClose: () => void;
}) {
  const span =
    point.from === point.to
      ? formatDay(point.from)
      : `${formatDay(point.from)} to ${formatDay(point.to)}`;
  return (
    <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold" style={strong}>
          Payments, {span}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold underline-offset-2 hover:underline"
          style={{ color: "var(--accent-teal)" }}
        >
          Close
        </button>
      </div>
      <ul className="mt-2 divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {entries.map((e) => (
          <li
            key={`${e.kind}-${e.id}`}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium" style={strong}>
                {e.clientName || e.clientEmail || "Unnamed client"}
              </span>
              <span className="block text-xs" style={muted}>
                {e.invoiceNumber} · {e.kind === "quote" ? "Quote" : "Invoice"} ·{" "}
                {formatDay(dayOf(e.date) ?? "")}
                {e.estimated && " · date estimated"}
              </span>
            </span>
            <span className="whitespace-nowrap tabular-nums" style={strong}>
              {formatMoney(e.amount, e.currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OutstandingCard({
  outstanding,
  loading,
}: {
  outstanding: OutstandingSummary;
  loading: boolean;
}) {
  const shown = outstanding.items.slice(0, OUTSTANDING_SHOWN);
  return (
    <ChartCard
      title="Outstanding and overdue"
      description="Sent invoices and requested quote stages that aren't paid, by age since they were issued. Overdue first. This is today's position, not limited to the range."
      loading={loading && outstanding.items.length === 0}
      empty={outstanding.items.length === 0 ? "Nothing is owed right now." : null}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <table className="w-full text-sm">
          <caption className="sr-only">Money owed by age</caption>
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th scope="col" className={headCell} style={muted}>
                Age
              </th>
              <th scope="col" className={`${headCell} text-right`} style={muted}>
                Invoices
              </th>
              <th scope="col" className={`${headCell} text-right`} style={muted}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {outstanding.ageing.map((b) => (
              <tr key={b.key} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <th scope="row" className={`${cell} text-left font-medium`} style={strong}>
                  {b.label}
                </th>
                <td className={`${cell} text-right tabular-nums`} style={muted}>
                  {b.count}
                </td>
                <td className={`${cell} text-right tabular-nums`} style={strong}>
                  {b.totals.length === 0
                    ? "–"
                    : b.totals.map((t) => (
                        <span key={t.currency} className="block whitespace-nowrap">
                          {formatMoney(t.amount, t.currency)}
                        </span>
                      ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <h4 className="text-xs font-semibold uppercase" style={muted}>
            {outstanding.items.length > OUTSTANDING_SHOWN
              ? `Oldest ${OUTSTANDING_SHOWN} of ${outstanding.items.length}`
              : "Invoices"}
          </h4>
          <ul className="mt-1 divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {shown.map((i) => (
              <li key={i.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium" style={strong}>
                    {i.clientName || "Unnamed client"}
                  </span>
                  <span className="block text-xs" style={muted}>
                    {i.number}
                    {i.ageDays !== null && ` · ${i.ageDays} days old`}
                    {i.overdue && (
                      <span style={{ color: "var(--status-failed-text)" }}> · Overdue</span>
                    )}
                  </span>
                </span>
                <span className="whitespace-nowrap tabular-nums" style={strong}>
                  {formatMoney(i.amount, i.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ChartCard>
  );
}
