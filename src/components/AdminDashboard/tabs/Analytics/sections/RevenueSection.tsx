import type React from "react";
import { useMemo, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "../../shared/money";
import { Avatar, BreakdownTable, MethodBreakdown, ShareList } from "../BreakdownTable";
import { CHART_COLORS, ChartCard, ChartLegend, axisTick } from "../ChartCard";
import { InfoTip } from "../KpiExtras";
import { compactNumber, formatDay, formatDelta } from "../metrics/format";
import { dayOf, delta, inRange, type Bucket, type DateRange } from "../metrics/range";
import {
  amountIn,
  byMethod,
  cashSeries,
  entriesIn,
  estimatedCount,
  owedStatus,
  topClients,
  unitCurrency,
  type CashPoint,
  type LedgerEntry,
  type MoneyUnit,
  type OutstandingSummary,
  type OwedStatus,
} from "../metrics/revenue";
import type { SourceErrors } from "../useAnalyticsData";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };
const cell = "py-2 pr-3";
const headCell = "py-2 pr-3 text-left text-xs font-semibold uppercase";

const OUTSTANDING_SHOWN = 10;
const BAR_RADIUS = 4;
const SEGMENT_GAP = 2;

/** Where the owed card sits, for the jump links. */
export const OWED_CARD_ID = "analytics-owed";

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

/** A bar path with optionally rounded top corners. */
function barPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.min(radius, h, w / 2);
  return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`;
}

interface Segment {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  point: CashPoint;
}

/** The geometry recharts hands a bar shape, checked rather than assumed. */
function segmentOf(props: unknown): Segment | null {
  if (typeof props !== "object" || props === null) return null;
  const { x, y, width, height, fill, payload } = props as Record<string, unknown>;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    typeof payload !== "object" ||
    payload === null ||
    !("invoice" in payload) ||
    !("quote" in payload)
  )
    return null;
  return { x, y, width, height, fill: String(fill), point: payload as CashPoint };
}

/**
 * One part of the stacked bar. Only the top part has rounded corners, and the
 * quote part stops short of the invoice part so the card shows between them.
 */
function StackSegment(props: unknown, part: "invoice" | "quote") {
  const s = segmentOf(props);
  if (!s || s.height <= 0) return <g />;
  const isTop = part === "quote" || s.point.quote <= 0;
  const gap = part === "quote" && s.point.invoice > 0 ? SEGMENT_GAP : 0;
  const height = s.height - gap;
  if (height <= 0) return <g />;
  return <path d={barPath(s.x, s.y, s.width, height, isTop ? BAR_RADIUS : 0)} fill={s.fill} />;
}

/** The hover card over a chart period. */
function CashHoverCard({
  point,
  money,
}: {
  point: CashPoint | undefined;
  money: (amount: number) => string;
}) {
  if (!point) return null;
  const change = delta(point.total, point.previous);
  const rising = change.kind === "change" && change.ratio > 0;
  const falling = change.kind === "change" && change.ratio < 0;
  const span =
    point.from === point.to
      ? formatDay(point.from)
      : `${formatDay(point.from)} to ${formatDay(point.to)}`;
  const line = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3.5">
      <span style={muted}>{label}</span>
      <span className="font-bold tabular-nums" style={strong}>
        {value}
      </span>
    </div>
  );
  return (
    <div
      className="min-w-[180px] rounded-xl border px-3 py-2.5 text-xs shadow-lg"
      style={{ background: "var(--analytics-card)", borderColor: "var(--analytics-line)" }}
    >
      <p className="mb-1 text-[13px] font-bold" style={strong}>
        {span}
      </p>
      {line("Invoices", money(point.invoice))}
      {line("Quotes", money(point.quote))}
      <div className="mt-1 border-t pt-1" style={{ borderColor: "var(--analytics-line)" }}>
        {line("Total", money(point.total))}
      </div>
      {line(
        "Previous period",
        <>
          <span className="font-medium" style={muted}>
            {money(point.previous)}
          </span>
          {change.kind !== "none" && (
            <span
              style={{
                color: rising
                  ? "var(--status-success-text)"
                  : falling
                    ? "var(--status-failed-text)"
                    : "var(--text-secondary)",
              }}
            >
              {" "}
              {formatDelta(change)}
            </span>
          )}
        </>,
      )}
      {point.total > 0 && (
        <p className="mt-1.5 text-[11px]" style={muted}>
          Click to list these payments
        </p>
      )}
    </div>
  );
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
  const loadingPayments = loading && ledger.length === 0;
  const paymentsFailed = errors.payments ? "Payments couldn't load." : null;

  const toggle = (key: string) => setSelected((cur) => (cur === key ? null : key));

  const table = (
    <table className="w-full text-sm">
      <caption className="sr-only">Cash collected per period, {unitLabel}</caption>
      <thead>
        <tr className="border-b" style={{ borderColor: "var(--analytics-line)" }}>
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
          <tr key={p.key} className="border-b" style={{ borderColor: "var(--analytics-line)" }}>
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

  const onBarClick = (d: { payload?: CashPoint }) => d.payload && toggle(d.payload.key);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 lg:col-span-2">
          <ChartCard
            title="Cash collected over time"
            description={`Per ${bucket}, ${unitLabel} · ${count} ${count === 1 ? "payment" : "payments"}`}
            info="The dashed line is the same slot of the previous period. Choose a bar, or a row in the table, to list its payments."
            aside={
              <ChartLegend
                items={[
                  { label: "Invoices", color: CHART_COLORS.invoice },
                  { label: "Quotes", color: CHART_COLORS.quote },
                  { label: "Previous period", color: CHART_COLORS.previous, dashed: true },
                ]}
              />
            }
            loading={loadingPayments}
            error={errors.payments ? `Payments couldn't load: ${errors.payments}` : null}
            empty={hasCash ? null : `No payments in ${unitLabel} in this range or the one before.`}
            table={table}
            footer={
              point && (
                <PaymentList point={point} entries={drill} onClose={() => toggle(point.key)} />
              )
            }
          >
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart
                data={series}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                title="Cash collected over time"
              >
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="2 4" />
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
                  width={40}
                  tickFormatter={(v: number) => compactNumber(v)}
                />
                <Tooltip
                  cursor={{ fill: "var(--analytics-line-soft)" }}
                  // Below the sticky filter bar (z-index 5) when the chart scrolls under it.
                  wrapperStyle={{ zIndex: 4, outline: "none" }}
                  content={({ active, payload }) =>
                    active ? <CashHoverCard point={payload?.[0]?.payload} money={money} /> : null
                  }
                />
                <Bar
                  dataKey="invoice"
                  name="Invoices"
                  stackId="cash"
                  fill={CHART_COLORS.invoice}
                  maxBarSize={46}
                  cursor="pointer"
                  shape={(props: unknown) => StackSegment(props, "invoice")}
                  onClick={onBarClick}
                />
                <Bar
                  dataKey="quote"
                  name="Quotes"
                  stackId="cash"
                  fill={CHART_COLORS.quote}
                  maxBarSize={46}
                  cursor="pointer"
                  shape={(props: unknown) => StackSegment(props, "quote")}
                  onClick={onBarClick}
                />
                <Line
                  dataKey="previous"
                  name="Previous period"
                  // Straight segments: a smoothed curve draws bumps between periods that look like data.
                  type="linear"
                  stroke={CHART_COLORS.previous}
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard
          title="By payment method"
          description={`Share of ${unitLabel} collected`}
          loading={loadingPayments}
          error={paymentsFailed}
          empty={methods.length === 0 ? "No payments in this range." : null}
          table={
            <BreakdownTable
              caption="Money received by payment method"
              keyHeader="Method"
              rows={methods}
              currency={currency}
              approx={approx}
              empty="No payments in this range."
            />
          }
          footer={estimated > 0 && <EstimatedNote count={estimated} />}
        >
          <MethodBreakdown rows={methods} currency={currency} approx={approx} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Top clients"
          description={`By cash collected in the range, ${unitLabel}`}
          loading={loadingPayments}
          error={paymentsFailed}
        >
          <ShareList
            rows={clients}
            currency={currency}
            approx={approx}
            avatars
            noun={["payment", "payments"]}
            empty="No payments in this range."
          />
        </ChartCard>
        <OutstandingCard outstanding={outstanding} loading={loading} />
      </div>
    </div>
  );
}

/** Paid invoices with no payment row, whose dates are a guess. */
function EstimatedNote({ count }: { count: number }) {
  return (
    <div
      className="mt-4 flex items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
      style={{ background: "var(--status-pending-bg)", color: "var(--status-pending-text)" }}
    >
      <FaExclamationTriangle aria-hidden="true" className="mt-0.5 shrink-0" />
      <p>
        {count} paid{" "}
        {count === 1 ? "invoice has an estimated date" : "invoices have estimated dates"}.{" "}
        <InfoTip label="Why the dates are estimated">
          {count === 1 ? "It has" : "They have"} no payment record, so the date comes from the
          invoice&rsquo;s last update. Running the payments backfill script
          (scripts/backfill-payments.mjs) fixes this.
        </InfoTip>
      </p>
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
    <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--analytics-line)" }}>
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
      <ul className="mt-2 divide-y divide-[var(--analytics-line)]">
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

const PILL_STYLES: Record<OwedStatus["kind"], { mark: string; style: React.CSSProperties }> = {
  overdue: {
    mark: "●",
    style: { background: "var(--status-failed-bg)", color: "var(--status-failed-text)" },
  },
  due: {
    mark: "◐",
    style: { background: "var(--status-pending-bg)", color: "var(--status-pending-text)" },
  },
  sent: {
    mark: "○",
    style: { background: "var(--accent-teal-subtle)", color: "var(--text-primary)" },
  },
};

/** A status in words, with a mark and colour that repeat it. */
function StatusPill({ status }: { status: OwedStatus }) {
  const { mark, style } = PILL_STYLES[status.kind];
  return (
    <span
      // Wraps on phones, where the table's status column is narrow.
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold sm:whitespace-nowrap"
      style={style}
    >
      <span aria-hidden="true">{mark}</span>
      {status.label}
    </span>
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
  const total = outstanding.items.length;
  return (
    <ChartCard
      id={OWED_CARD_ID}
      title="Owed to you now"
      description={
        total > OUTSTANDING_SHOWN
          ? `Overdue first, then oldest: ${OUTSTANDING_SHOWN} of ${total}. Not limited to the range.`
          : "Overdue first, then oldest. Not limited to the range."
      }
      info="Sent invoices and requested quote stages that aren't paid. Due soon means due within a week."
      aside={
        outstanding.overdueCount > 0 && (
          <StatusPill status={{ kind: "overdue", label: `${outstanding.overdueCount} overdue` }} />
        )
      }
      loading={loading && total === 0}
      empty={total === 0 ? "Nothing is owed right now." : null}
    >
      {/* Fixed layout so a long client name truncates instead of widening the card. */}
      <table className="w-full table-fixed text-sm tabular-nums">
        <caption className="sr-only">Invoices and quote stages owed now</caption>
        <colgroup>
          <col />
          <col className="w-[6.5rem] sm:w-[8.5rem]" />
          <col className="w-[6rem] sm:w-[6.5rem]" />
        </colgroup>
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--analytics-line)" }}>
            <th scope="col" className="pb-2 pr-2 text-left text-xs font-bold" style={muted}>
              Client
            </th>
            <th scope="col" className="pb-2 pr-2 text-left text-xs font-bold" style={muted}>
              Status
            </th>
            <th scope="col" className="pb-2 text-right text-xs font-bold" style={muted}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((i) => (
            <tr
              key={i.key}
              className="border-b"
              style={{ borderColor: "var(--analytics-line-soft)" }}
            >
              <td className="py-2.5 pr-2">
                <span className="flex items-center gap-2.5">
                  <span className="hidden sm:inline-flex">
                    <Avatar name={i.clientName || "?"} size={28} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold" style={strong}>
                      {i.clientName || "Unnamed client"}
                    </span>
                    <span className="block truncate font-mono text-xs" style={muted}>
                      {i.number}
                    </span>
                  </span>
                </span>
              </td>
              <td className="py-2.5 pr-2">
                <StatusPill status={owedStatus(i)} />
              </td>
              <td className="py-2.5 text-right font-bold" style={strong}>
                {formatMoney(i.amount, i.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ChartCard>
  );
}
