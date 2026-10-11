export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "cancelled";
export type QuoteCurrency = "GHS" | "USD";
export type StageState = "paid" | "due" | "later";
export type PayMethod = "card" | "momo" | "apple_pay";
export type ManualMethod = "bank" | "momo" | "cash";

export interface QuoteItem {
  id: string;
  description: string;
  qty: number;
  unitMinor: number;
}

export interface QuoteStageDef {
  id: string;
  label: string;
  percent: number;
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
  items: (QuoteItem & { lineMinor: number })[];
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  issuedAt: string | null;
  validUntil: string | null;
  acceptedName: string | null;
  respondedAt: string | null;
  stages: ClientStage[];
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
