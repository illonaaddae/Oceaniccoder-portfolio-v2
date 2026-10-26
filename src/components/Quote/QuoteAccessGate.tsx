import { useMemo } from "react";
import QuoteShell from "./QuoteShell";
import DocumentAccessGate, { LockedDocument } from "@/components/Access/DocumentAccessGate";
import { quoteAccessTarget } from "@/services/api/access";

// The code screen for a quote link opened in a browser with no unlock
// (docs/plans/2026-10-20-quote-access-code.md): the shared document gate,
// bound to /api/quote-access and the quote's words.

export default function QuoteAccessGate({
  token,
  onUnlocked,
}: {
  token: string;
  onUnlocked: () => void;
}) {
  const target = useMemo(() => quoteAccessTarget(token), [token]);
  return <DocumentAccessGate target={target} onUnlocked={onUnlocked} />;
}

/** The whole page for a locked quote; see LockedDocument. */
export function LockedQuote({
  token,
  onUnlocked,
  onRetry,
  admin = false,
  cookieBlocked = false,
}: {
  token: string;
  onUnlocked: () => void;
  onRetry: () => void;
  admin?: boolean;
  cookieBlocked?: boolean;
}) {
  const target = useMemo(() => quoteAccessTarget(token), [token]);
  return (
    <QuoteShell title="Open your quote" width="narrow">
      <LockedDocument
        target={target}
        onUnlocked={onUnlocked}
        onRetry={onRetry}
        admin={admin}
        cookieBlocked={cookieBlocked}
      />
    </QuoteShell>
  );
}
