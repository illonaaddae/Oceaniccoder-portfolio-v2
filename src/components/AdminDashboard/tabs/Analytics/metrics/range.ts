// Date ranges, buckets and period-over-period deltas for the Analytics tab.
// Days are UTC calendar days ("YYYY-MM-DD"). Ghana is UTC+0 all year, so a
// UTC day is the business day. Definitions: docs/plans/2026-10-12-admin-analytics-design.md §5.6.

export type Preset = "7d" | "30d" | "90d" | "12m" | "custom";
export type Bucket = "day" | "week" | "month";

/** Inclusive at both ends. */
export interface DateRange {
  from: string;
  to: string;
}

export interface RangeChoice {
  preset: Preset;
  /** Only for "custom". */
  from?: string;
  to?: string;
}

export interface BucketSpan {
  key: string;
  label: string;
  from: string;
  to: string;
}

export const MAX_RANGE_DAYS = 400;
export const RANGE_STORAGE_KEY = "oc_analytics_range";

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const PRESET_DAYS: Record<Exclude<Preset, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

export const PRESET_LABELS: Record<Preset, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "12m": "12 months",
  custom: "Custom",
};

const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (day: string, days: number) => toDay(dayMs(day) + days * DAY_MS);

export const todayUTC = (now: Date = new Date()) => toDay(now.getTime());

/** The UTC day of a timestamp or plain date, or null when it can't be read. */
export function dayOf(value: string | null | undefined): string | null {
  if (!value) return null;
  if (ISO_DAY.test(value)) return value;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : toDay(ms);
}

export const isValidDay = (value: unknown): value is string =>
  typeof value === "string" && ISO_DAY.test(value) && !Number.isNaN(dayMs(value));

/** Number of days in the range, counting both ends. */
export const rangeDays = (r: DateRange) => Math.round((dayMs(r.to) - dayMs(r.from)) / DAY_MS) + 1;

export const inRange = (day: string | null, r: DateRange) =>
  day !== null && day >= r.from && day <= r.to;

/** The preset ending today, or the custom dates as given. */
export function resolveRange(choice: RangeChoice, now: Date = new Date()): DateRange {
  const today = todayUTC(now);
  if (choice.preset === "custom" && choice.from && choice.to)
    return { from: choice.from, to: choice.to };
  const days = choice.preset === "custom" ? PRESET_DAYS["30d"] : PRESET_DAYS[choice.preset];
  return { from: addDays(today, -(days - 1)), to: today };
}

/** The same number of days, ending the day before `from`. */
export function previousRange(r: DateRange): DateRange {
  const n = rangeDays(r);
  return { from: addDays(r.from, -n), to: addDays(r.from, -1) };
}

/** Why custom dates can't be used, or null when they can. */
export function customRangeError(from: string, to: string, now: Date = new Date()): string | null {
  if (!isValidDay(from) || !isValidDay(to)) return "Choose a start and an end date.";
  if (from > to) return "The start date is after the end date.";
  if (to > todayUTC(now)) return "The end date can't be in the future.";
  if (rangeDays({ from, to }) > MAX_RANGE_DAYS) return `Choose ${MAX_RANGE_DAYS} days or fewer.`;
  return null;
}

/** Day buckets up to 31 days, weeks up to 180, months beyond. */
export function bucketFor(r: DateRange): Bucket {
  const n = rangeDays(r);
  if (n <= 31) return "day";
  if (n <= 180) return "week";
  return "month";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

function startOfBucket(day: string, bucket: Bucket): string {
  if (bucket === "day") return day;
  if (bucket === "month") return `${day.slice(0, 7)}-01`;
  // Weeks start on Monday.
  const weekday = new Date(dayMs(day)).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

function endOfBucket(start: string, bucket: Bucket): string {
  if (bucket === "day") return start;
  if (bucket === "week") return addDays(start, 6);
  const d = new Date(dayMs(start));
  return toDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

/**
 * Consecutive buckets covering the range. The first and last are clipped to
 * the range, so a week or month at either end may be partial.
 */
export function bucketsFor(r: DateRange, bucket: Bucket = bucketFor(r)): BucketSpan[] {
  const spans: BucketSpan[] = [];
  let start = startOfBucket(r.from, bucket);
  while (start <= r.to) {
    const end = endOfBucket(start, bucket);
    const from = start < r.from ? r.from : start;
    const to = end > r.to ? r.to : end;
    const label =
      bucket === "month"
        ? `${MONTHS[Number(start.slice(5, 7)) - 1]} ${start.slice(0, 4)}`
        : bucket === "week"
          ? `w/c ${dayLabel(start)}`
          : dayLabel(start);
    spans.push({ key: start, label, from, to });
    start = addDays(end, 1);
  }
  return spans;
}

/** Shifts a span back by `days`, to line the previous period up with this one. */
export const shiftSpan = (span: BucketSpan, days: number): DateRange => ({
  from: addDays(span.from, -days),
  to: addDays(span.to, -days),
});

export type Delta = { kind: "change"; ratio: number } | { kind: "new" } | { kind: "none" };

/**
 * (current − previous) ÷ |previous|. "new" when the previous period was zero
 * and this one isn't; "none" when both are zero. The absolute value keeps the
 * sign meaningful when the previous figure was negative (a loss).
 */
export function delta(current: number, previous: number): Delta {
  if (previous === 0) return current === 0 ? { kind: "none" } : { kind: "new" };
  return { kind: "change", ratio: (current - previous) / Math.abs(previous) };
}

/** The saved choice, or 30 days when nothing usable is saved. */
export function loadRangeChoice(
  storage: { getItem(key: string): string | null } | undefined,
  now: Date = new Date(),
): RangeChoice {
  const fallback: RangeChoice = { preset: "30d" };
  try {
    const raw = storage?.getItem(RANGE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<RangeChoice>;
    if (parsed.preset === "custom") {
      const { from = "", to = "" } = parsed;
      return customRangeError(from, to, now) === null ? { preset: "custom", from, to } : fallback;
    }
    return parsed.preset && parsed.preset in PRESET_DAYS ? { preset: parsed.preset } : fallback;
  } catch {
    return fallback;
  }
}

export function saveRangeChoice(
  storage: { setItem(key: string, value: string): void } | undefined,
  choice: RangeChoice,
): void {
  try {
    storage?.setItem(RANGE_STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Private mode or a full quota: the range just isn't remembered.
  }
}
