import type {
  AdminQuote,
  MaintenancePlan,
  MaintenanceSection,
  QuoteCurrency,
  QuoteDraft,
  QuoteItem,
  QuoteStageDef,
} from "@/types/quote";

// Editor-side copy of the server's quote rules (api/shared/quotes/model.js),
// so totals and stage amounts update as the admin types. quoteMath.test.ts
// checks the two stay identical.

export const DEFAULT_SCHEDULE: QuoteStageDef[] = [
  { id: "deposit", label: "Deposit", percent: 60 },
  { id: "balance", label: "Balance", percent: 40 },
];

export const DEFAULT_TERMS = [
  "- Work starts once the deposit is received.",
  "- The balance is due on delivery, before final files, source code and credentials are handed over.",
  "- This quote covers the scope above. New features or changes are quoted separately.",
  "- Third-party costs (domains, hosting, app store fees, paid APIs) are paid by the client unless listed above.",
  "- Each payment stage is invoiced separately and is due within 7 days of its invoice.",
].join("\n");

const ID_RE = /^[a-z0-9-]{1,24}$/;

/** Mirrors the maintenance LIMITS in api/shared/quotes/model.js; the server has the final say. */
export const MAINTENANCE_MAX = {
  freeDays: 365,
  freeText: 300,
  plans: 4,
  name: 60,
  includes: 600,
  note: 600,
};

export const DEFAULT_MAINTENANCE_FREE_TEXT = "Any defect found is fixed at no cost.";

/** What "Include in this quote" starts with. */
export function defaultMaintenance(): MaintenanceSection {
  return { freeDays: 30, freeText: DEFAULT_MAINTENANCE_FREE_TEXT, plans: [], note: "" };
}

/** "Use my standard plans": amounts are in the quote's currency; edit per client. */
export function standardMaintenancePlans(): MaintenancePlan[] {
  return [
    {
      id: newId("plan"),
      name: "Care",
      priceMinor: 40000,
      period: "month",
      includes:
        "Security and dependency updates\nUptime monitoring\nMonthly backups check\nSmall content edits (up to 1 hour)",
    },
    {
      id: newId("plan"),
      name: "Care Plus",
      priceMinor: 90000,
      period: "month",
      includes:
        "Everything in Care\nUp to 4 hours of changes or small features\nPriority response within 1 working day\nMonthly performance report",
    },
  ];
}

export function lineMinor(item: Pick<QuoteItem, "qty" | "unitMinor">): number {
  return Math.round(Number(item.qty) * Number(item.unitMinor));
}

export function computeTotals(items: Pick<QuoteItem, "qty" | "unitMinor">[], discountMinor = 0) {
  const subtotalMinor = items.reduce((sum, i) => sum + lineMinor(i), 0);
  const discount = Math.min(Math.max(0, Math.round(Number(discountMinor) || 0)), subtotalMinor);
  return { subtotalMinor, discountMinor: discount, totalMinor: subtotalMinor - discount };
}

export function stageAmounts(totalMinor: number, schedule: QuoteStageDef[]) {
  let allocated = 0;
  return schedule.map((stage, i) => {
    const last = i === schedule.length - 1;
    const amountMinor = last
      ? totalMinor - allocated
      : Math.floor((totalMinor * stage.percent) / 100);
    allocated += amountMinor;
    return { ...stage, amountMinor };
  });
}

export function scheduleError(schedule: QuoteStageDef[]): string | null {
  if (!Array.isArray(schedule) || schedule.length < 1 || schedule.length > 8)
    return "Use between 1 and 8 payment stages.";
  const ids = new Set<string>();
  for (const s of schedule) {
    if (!s || !ID_RE.test(s.id) || ids.has(s.id)) return "Each stage needs a unique id.";
    ids.add(s.id);
    if (!s.label || s.label.length > 40) return "Give every stage a name (up to 40 characters).";
    if (!Number.isInteger(s.percent) || s.percent < 1 || s.percent > 100)
      return "Each stage must be a whole percentage from 1 to 100.";
  }
  const sum = schedule.reduce((t, s) => t + s.percent, 0);
  if (sum !== 100) return `Stages add up to ${sum}%. They must add up to 100%.`;
  return null;
}

export function formatMinor(minor: number, currency: QuoteCurrency | string): string {
  const major = (Number(minor) || 0) / 100;
  return `${currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "1,234.5" → 123450. Returns null for anything that isn't a plain amount with at most 2 decimals. */
export function toMinor(input: string): number | null {
  const trimmed = input.trim();
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(trimmed)) return null;
  const clean = trimmed.replace(/,/g, "");
  const [whole, frac = ""] = clean.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function fromMinor(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Accra",
  }).format(date);
}

/** Editor draft from a saved quote (or nothing): null/undefined fields fall back to the defaults. */
export function quoteToDraft(q: Partial<AdminQuote> | null | undefined): QuoteDraft {
  const pick = <T>(value: T | null | undefined, fallback: T): T => value ?? fallback;
  return {
    clientName: pick(q?.clientName, ""),
    clientEmail: pick(q?.clientEmail, ""),
    clientPhone: pick(q?.clientPhone, ""),
    clientCompany: pick(q?.clientCompany, ""),
    currency: pick(q?.currency, "GHS"),
    title: pick(q?.title, ""),
    overview: pick(q?.overview, ""),
    scope: pick(q?.scope, ""),
    timeline: pick(q?.timeline, ""),
    notes: pick(q?.notes, ""),
    terms: pick(q?.terms, DEFAULT_TERMS),
    items: q?.items?.length
      ? q.items.map((i) => ({ ...i }))
      : [{ id: newId("item"), description: "", qty: 1, unitMinor: 0 }],
    discountMinor: pick(q?.discountMinor, 0),
    schedule: q?.schedule?.length
      ? q.schedule.map((s) => ({ ...s }))
      : DEFAULT_SCHEDULE.map((s) => ({ ...s })),
    validDays: pick(q?.validDays, 14),
    inquiryId: pick(q?.inquiryId, null),
    highlights: q?.highlights ? [...q.highlights] : [],
    discountLabel: pick(q?.discountLabel, ""),
    runningCosts: q?.runningCosts ? q.runningCosts.map((r) => ({ ...r })) : [],
    exclusions: pick(q?.exclusions, ""),
    assumptions: pick(q?.assumptions, ""),
    nextSteps: pick(q?.nextSteps, ""),
    optionalTitle: pick(q?.optionalTitle, ""),
    optionalItems: q?.optionalItems ? q.optionalItems.map((i) => ({ ...i })) : [],
    extras: {
      needs: q?.extras?.needs
        ? {
            intro: q.extras.needs.intro ?? "",
            groups: (q.extras.needs.groups ?? []).map((g) => ({
              ...g,
              rows: g.rows.map((r) => ({ ...r })),
            })),
          }
        : null,
      maintenance: q?.extras?.maintenance
        ? {
            freeDays: q.extras.maintenance.freeDays ?? 0,
            freeText: q.extras.maintenance.freeText ?? "",
            plans: (q.extras.maintenance.plans ?? []).map((p) => ({ ...p })),
            note: q.extras.maintenance.note ?? "",
          }
        : null,
    },
  };
}
