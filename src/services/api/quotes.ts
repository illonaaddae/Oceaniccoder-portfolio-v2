import { apiUrl } from "@/utils/apiUrl";
import { adminHeaders } from "./adminHeaders";
import type { ClientQuote, PayMethod, PaymentCheckState, ReceiptView } from "@/types/quote";

type FetchInit = Parameters<typeof fetch>[1];

export class QuoteApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "QuoteApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function call<T>(path: string, init?: FetchInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), init);
  } catch {
    throw new QuoteApiError(
      "We couldn't reach the server. Check your connection and try again.",
      0,
    );
  }
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    fields?: Record<string, string>;
  };
  if (!res.ok)
    throw new QuoteApiError(
      body.error || "Something went wrong. Please try again.",
      res.status,
      body.fields,
    );
  return body as T;
}

const postJson = (body: unknown): FetchInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function fetchClientQuote(token: string, preview = false) {
  return call<{ quote: ClientQuote }>(
    `/api/quote-view?token=${encodeURIComponent(token)}${preview ? "&preview=1" : ""}`,
  );
}

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

export async function fetchEmailPreview(name?: string) {
  const headers = await adminHeaders();
  const path = name ? `/api/email-preview?name=${encodeURIComponent(name)}` : "/api/email-preview";
  return call<{ templates?: string[]; subject?: string; html?: string; text?: string }>(path, {
    headers,
  });
}

export async function sendTestEmail(name: string) {
  const headers = await adminHeaders();
  return call<{ sent: boolean; to: string }>("/api/email-preview", {
    method: "POST",
    headers,
    body: JSON.stringify({ name }),
  });
}
