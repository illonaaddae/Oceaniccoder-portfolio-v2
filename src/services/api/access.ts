import type { DocumentKind } from "@/utils/linkCode";
import {
  call,
  claimQuoteLink,
  fetchQuoteAccess,
  postJson,
  sendQuoteCode,
  verifyQuoteCode,
  type QuoteAccessStatus,
  type QuoteCodeSent,
} from "./quotes";

/**
 * The access calls for one client document, so the code screen
 * (DocumentAccessGate) works the same for a quote, an invoice or a receipt.
 * Errors are QuoteApiError with its access details, for every kind.
 * Design: docs/plans/2026-10-25-invoice-receipt-access-codes.md (8.4, 8.6).
 */
export interface AccessTarget {
  kind: DocumentKind;
  /** The link's key: quote token, invoice number or receipt reference. */
  key: string;
  status(): Promise<QuoteAccessStatus>;
  /** Emails a 6-digit code to the client email on the record. */
  send(): Promise<QuoteCodeSent>;
  verify(challenge: string, code: string): Promise<{ ok: true }>;
  /** Signs this browser in with the one-time link code from the email. */
  claim(linkCode: string): Promise<{ ok: true }>;
}

export const quoteAccessTarget = (token: string): AccessTarget => ({
  kind: "quote",
  key: token,
  status: () => fetchQuoteAccess(token),
  send: () => sendQuoteCode(token),
  verify: (challenge, code) => verifyQuoteCode(token, challenge, code),
  claim: (linkCode) => claimQuoteLink(token, linkCode),
});

/** How /api/doc-access finds the record; `s` is the link's signature. */
export type DocumentLocator =
  | { kind: "invoice"; number: string; s?: string }
  | { kind: "receipt"; reference: string; s: string };

const docAccess = <T>(locator: DocumentLocator, body: Record<string, unknown>) =>
  call<T>("/api/doc-access", postJson({ ...locator, ...body }));

export function docAccessTarget(locator: DocumentLocator): AccessTarget {
  return {
    kind: locator.kind,
    key: locator.kind === "invoice" ? locator.number : locator.reference,
    status: () => docAccess(locator, { action: "status" }),
    send: () => docAccess(locator, { action: "send" }),
    verify: (challenge, code) => docAccess(locator, { action: "verify", challenge, code }),
    claim: (linkCode) => docAccess(locator, { action: "claim", linkCode }),
  };
}
