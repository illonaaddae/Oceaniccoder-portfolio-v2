export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "cancelled";
export type QuoteCurrency = "GHS" | "USD";
export type StageState = "paid" | "due" | "later";
export type PayMethod = "card" | "momo" | "apple_pay";
export type ManualMethod = "bank" | "momo" | "cash";

export interface RunningCost {
  service: string;
  purpose: string;
  cost: string;
}

/** Second column heading of a needs table. */
export type NeedsDetailLabel = "Used for" | "Notes";

export interface NeedsRow {
  id: string;
  item: string;
  detail: string;
  when: string;
}

export interface NeedsGroup {
  id: string;
  title: string;
  intro: string;
  detailLabel: NeedsDetailLabel;
  rows: NeedsRow[];
  footnote: string;
}

/** "What I'll need from you" as grouped tables (stored in `extras.needs`). */
export interface NeedsTables {
  intro: string;
  groups: NeedsGroup[];
}

/** The `extras` JSON column. Mirrors parseExtras in api/shared/quotes/model.js. */
export interface QuoteExtras {
  needs: NeedsTables | null;
}

export interface QuoteItem {
  id: string;
  description: string;
  qty: number;
  unitMinor: number;
  detail?: string;
}

export interface QuoteStageDef {
  id: string;
  label: string;
  percent: number;
  note?: string;
}

export interface QuoteDraft {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany: string;
  currency: QuoteCurrency;
  title: string;
  overview: string;
  scope: string;
  timeline: string;
  notes: string;
  terms: string;
  items: QuoteItem[];
  discountMinor: number;
  schedule: QuoteStageDef[];
  validDays: number;
  inquiryId?: string | null;
  highlights: string[];
  discountLabel: string;
  runningCosts: RunningCost[];
  exclusions: string;
  assumptions: string;
  nextSteps: string;
  optionalTitle: string;
  optionalItems: QuoteItem[];
  extras: QuoteExtras;
}

/** A stage as the client pages see it. */
export interface ClientStage extends QuoteStageDef {
  index: number;
  amountMinor: number;
  state: StageState;
  dueAt: string | null;
  dueBy: string | null;
  overdue: boolean;
  invoiceNumber: string;
  paidAt: string | null;
  receiptPath: string | null;
}

/** A stage as the admin sees it (from model.stageStates). */
export interface AdminStage extends QuoteStageDef {
  index: number;
  amountMinor: number;
  state: StageState;
  dueAt: string | null;
  overdue: boolean;
  invoiceNumber: string;
  paidAt: string | null;
  reference: string | null;
}

export interface ClientQuote {
  quoteNumber: string;
  revision: number;
  status: QuoteStatus;
  currency: QuoteCurrency;
  title: string;
  overview: string;
  scope: string;
  timeline: string;
  notes: string;
  terms: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  items: (QuoteItem & { lineMinor: number; detail: string })[];
  highlights: string[];
  discountLabel: string;
  runningCosts: RunningCost[];
  exclusions: string;
  assumptions: string;
  nextSteps: string;
  optionalTitle: string;
  optionalItems: (QuoteItem & { lineMinor: number; detail: string })[];
  optionalTotalMinor: number;
  /** Absent on responses from before the column existed. */
  extras?: QuoteExtras;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  issuedAt: string | null;
  validUntil: string | null;
  acceptedName: string | null;
  respondedAt: string | null;
  stages: (ClientStage & { note: string })[];
  summary: { paidMinor: number; balanceMinor: number; complete: boolean };
  contact: { email: string; whatsapp: string };
}

/** Mirrors adminQuoteView in api/shared/quotes/views.js: unset fields arrive as null. */
export interface AdminQuote {
  id: string;
  quoteNumber: string;
  revision: number;
  status: QuoteStatus;
  currency: QuoteCurrency;
  title: string;
  overview: string | null;
  scope: string | null;
  timeline: string | null;
  notes: string | null;
  terms: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientCompany: string | null;
  items: QuoteItem[];
  discountMinor: number | null;
  subtotalMinor: number;
  totalMinor: number;
  schedule: QuoteStageDef[];
  validDays: number | null;
  validUntil: string | null;
  inquiryId: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  acceptedName: string | null;
  acceptedUa: string | null;
  declineReason: string | null;
  payState: { due: Record<string, string> } | null;
  requirementsId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  hasLink: boolean;
  highlights?: string[] | null;
  discountLabel?: string | null;
  runningCosts?: RunningCost[] | null;
  exclusions?: string | null;
  assumptions?: string | null;
  nextSteps?: string | null;
  optionalTitle?: string | null;
  optionalItems?: QuoteItem[] | null;
  extras?: QuoteExtras | null;
}

/** A stage invoice that exists for the client (requested or paid). */
export interface QuoteStageInvoice {
  stageId: string;
  invoiceNumber: string;
  label: string;
  percent: number;
  amountMinor: number;
  state: "due" | "paid";
  dueBy: string | null;
  overdue: boolean;
  paidAt: string | null;
}

export interface QuoteSummary {
  id: string;
  quoteNumber: string;
  title: string;
  clientName: string;
  status: QuoteStatus;
  currency: QuoteCurrency;
  totalMinor: number;
  paidMinor: number;
  complete: boolean;
  nextDue: { id: string; label: string; overdue: boolean } | null;
  sentAt: string | null;
  viewedAt: string | null;
  updatedAt: string | null;
  invoices?: QuoteStageInvoice[];
}

export interface QuotePayment {
  id: string;
  reference: string;
  stageId: string;
  amountMinor: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
  note: string;
  recordedBy: string;
  createdAt: string | null;
}

export interface QuoteDetailResponse {
  quote: AdminQuote;
  stages: AdminStage[];
  payments: QuotePayment[];
  link?: string;
  emailed?: boolean;
}

export interface ReceiptView {
  quoteNumber: string;
  title: string;
  clientName: string;
  clientCompany: string;
  stageLabel: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  method: string;
  reference: string;
  paidAt: string;
  balanceMinor: number;
}

export type PaymentCheckState = "paid" | "pending" | "failed" | "duplicate";
