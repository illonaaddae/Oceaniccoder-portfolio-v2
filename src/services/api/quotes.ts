import { apiUrl } from "@/utils/apiUrl";
import { adminHeaders } from "./adminHeaders";
import type { ClientQuote, PayMethod, PaymentCheckState, ReceiptView } from "@/types/quote";

type FetchInit = Parameters<typeof fetch>[1];

/** What the quote access gate adds to an error answer (api/quote-access, the gated endpoints). */
export interface QuoteAccessDetails {
  /** The browser has no unlock for this quote. */
  locked?: boolean;
  triesLeft?: number;
  /** Too many wrong codes: no more are sent until the admin issues a new link. */
  blocked?: boolean;
  /** The typed code's challenge is spent or stale; ask for a new code. */
  newCodeNeeded?: boolean;
  /** The quote has no client email, so no code can be sent. */
  noEmail?: boolean;
  /** The kill switch is on: the quote opens without a code. */
  gateOff?: boolean;
  retryAfterSeconds?: number;
}

const flag = (v: unknown) => (v === true ? true : undefined);
const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

function accessDetails(body: Record<string, unknown>): QuoteAccessDetails {
  return {
    locked: flag(body.locked),
    triesLeft: count(body.triesLeft),
    blocked: flag(body.blocked),
    newCodeNeeded: flag(body.newCodeNeeded),
    noEmail: flag(body.noEmail),
    gateOff: flag(body.gateOff),
    retryAfterSeconds: count(body.retryAfterSeconds),
  };
}

export class QuoteApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  inactive?: boolean;
  access: QuoteAccessDetails;
  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>,
    inactive?: boolean,
    access: QuoteAccessDetails = {},
  ) {
    super(message);
    this.name = "QuoteApiError";
    this.status = status;
    this.fields = fields;
    this.inactive = inactive;
    this.access = access;
  }
}

/** True for the gate's 401: the page should show the code screen. */
export const isLockedError = (err: unknown) =>
  err instanceof QuoteApiError && err.access.locked === true;

/** Fetches an /api path; a failed answer throws QuoteApiError with its access details. Shared with access.ts. */
export async function call<T>(path: string, init?: FetchInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), init);
  } catch {
    throw new QuoteApiError(
      "We couldn't reach the server. Check your connection and try again.",
      0,
    );
  }
  let body: {
    error?: string;
    fields?: Record<string, string>;
    inactive?: boolean;
  } & Record<string, unknown>;
  try {
    body = await res.json();
  } catch {
    if (res.ok) throw new QuoteApiError("Unexpected response from the server.", res.status);
    body = {};
  }
  if (!res.ok)
    throw new QuoteApiError(
      body.error || "Something went wrong. Please try again.",
      res.status,
      body.fields,
      body.inactive,
      accessDetails(body),
    );
  return body as T;
}

export const postJson = (body: unknown): FetchInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * preview: don't record the client's first view. admin: the dashboard's
 * Preview link (?preview=admin); the server checks the admin session instead
 * of the client's unlock, and records nothing.
 */
export async function fetchClientQuote(
  token: string,
  { preview = false, admin = false }: { preview?: boolean; admin?: boolean } = {},
) {
  const query = `token=${encodeURIComponent(token)}${preview || admin ? "&preview=1" : ""}`;
  if (!admin) return call<{ quote: ClientQuote }>(`/api/quote-view?${query}`);
  return call<{ quote: ClientQuote }>(`/api/quote-view?${query}&admin=1`, {
    headers: await adminHeaders(),
  });
}

/** The dashboard's Preview link for a client link; any "#k=" link code is left off. */
export const adminPreviewLink = (link: string) => `${link.split("#")[0]}?preview=admin`;

export interface QuoteAccessStatus {
  locked: boolean;
  canUnlock?: boolean;
  blocked?: boolean;
  /**
   * "p•••••@hotmail.com", or null when the document has no client email or
   * (doc-access) the address is hidden on an unsigned invoice link.
   */
  maskedEmail?: string | null;
  gateOff?: boolean;
}

export interface QuoteCodeSent {
  challenge: string;
  maskedEmail: string | null;
  expiresInSeconds: number;
  retryAfterSeconds: number;
}

const quoteAccess = <T>(body: Record<string, unknown>) =>
  call<T>("/api/quote-access", postJson(body));

export const fetchQuoteAccess = (token: string) =>
  quoteAccess<QuoteAccessStatus>({ action: "status", token });

/** Signs this browser in with the one-time link code from the email. */
export const claimQuoteLink = (token: string, linkCode: string) =>
  quoteAccess<{ ok: true }>({ action: "claim", token, linkCode });

/** Emails a 6-digit code to the client email on the quote. */
export const sendQuoteCode = (token: string) =>
  quoteAccess<QuoteCodeSent>({ action: "send", token });

export const verifyQuoteCode = (token: string, challenge: string, code: string) =>
  quoteAccess<{ ok: true }>({ action: "verify", token, challenge, code });

export function respondToQuote(
  token: string,
  body: { action: "accept"; name: string; agree: boolean } | { action: "decline"; reason: string },
) {
  return call<{ quote: ClientQuote }>("/api/quote-respond", postJson({ token, ...body }));
}

export function startStagePayment(body: {
  token: string;
  stageId: string;
  method: PayMethod;
  email: string;
  /** Mobile Money network; required by the server when method is "momo". */
  network?: string;
}) {
  return call<{ accessCode: string; authorizationUrl: string; reference: string }>(
    "/api/quote-pay",
    postJson(body),
  );
}

export function checkStagePayment(token: string, reference: string) {
  return call<{ state: PaymentCheckState; receiptPath: string | null }>(
    `/api/quote-pay?token=${encodeURIComponent(token)}&reference=${encodeURIComponent(reference)}`,
    undefined,
  );
}

export function fetchReceipt(reference: string, sig: string) {
  return call<{ receipt: ReceiptView }>(
    `/api/quote-receipt?reference=${encodeURIComponent(reference)}&s=${encodeURIComponent(sig)}`,
  );
}

export async function quoteAdmin<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const headers = await adminHeaders();
  return call<T>("/api/quote-admin", {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...payload }),
  });
}

export type EmailGroup = "clients" | "admin";

/** One entry in the admin Emails tab list. */
export interface EmailTemplateInfo {
  id: string;
  group: EmailGroup;
  name: string;
  when: string;
  subject: string;
}

export interface EmailPreviewList {
  from?: string;
  templates?: EmailTemplateInfo[];
}

export interface EmailPreviewMail {
  name?: string;
  subject?: string;
  html?: string;
  text?: string;
}

/** With no name, lists every email; with a name, renders that one. */
export async function fetchEmailPreview(name?: string) {
  const headers = await adminHeaders();
  const path = name ? `/api/email-preview?name=${encodeURIComponent(name)}` : "/api/email-preview";
  return call<EmailPreviewList & EmailPreviewMail>(path, { headers });
}

export async function sendTestEmail(name: string) {
  const headers = await adminHeaders();
  return call<{ sent: boolean; to: string }>("/api/email-preview", {
    method: "POST",
    headers,
    body: JSON.stringify({ name }),
  });
}
