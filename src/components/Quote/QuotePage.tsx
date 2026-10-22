import { Link, useParams, useSearchParams } from "react-router-dom";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading } from "./QuoteShell";
import QuoteDocument, { TermsAndNotes } from "./QuoteDocument";
import JourneyBar from "./JourneyBar";
import { OptionalExtras } from "./ProposalSections";
import StagePlan from "./StagePlan";
import QuoteActions from "./QuoteActions";
import InactiveLink from "./InactiveLink";
import { LockedQuote } from "./QuoteAccessGate";
import { previewQuery, useClientQuote } from "./useClientQuote";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import type { ClientQuote } from "@/types/quote";

export function StatusBanner({ quote }: { quote: ClientQuote }) {
  const banners: Partial<Record<ClientQuote["status"], [string, string]>> = {
    accepted: [
      `Accepted by ${quote.acceptedName} on ${formatDate(quote.respondedAt)}.`,
      "var(--status-success-bg)",
    ],
    declined: [
      "You declined this quote. If that was a mistake, get in touch and we'll reopen it.",
      "var(--status-pending-bg)",
    ],
    expired: [
      "This quote has expired. Ask us for an updated one and we'll send it over.",
      "var(--status-pending-bg)",
    ],
  };
  const banner = banners[quote.status];
  if (!banner) return null;
  return (
    <div
      role="status"
      className="rounded-xl px-4 py-3 text-sm"
      style={{ background: banner[1], color: "var(--text-primary)" }}
    >
      {banner[0]}
      {(quote.status === "declined" || quote.status === "expired") && (
        <>
          {" "}
          <a
            href={`mailto:${quote.contact.email}?subject=${encodeURIComponent(`Quote ${quote.quoteNumber}`)}`}
            className="underline font-medium"
          >
            Email us at {quote.contact.email}
          </a>
        </>
      )}
    </div>
  );
}

function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`min-h-12 px-5 rounded-xl border print:hidden ${className}`}
      style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
    >
      Print or save PDF
    </button>
  );
}

function NextStep({ quote, token, query }: { quote: ClientQuote; token: string; query: string }) {
  const next = quote.stages.find((s) => s.state === "due");
  if (quote.summary.complete) {
    return (
      <QuoteCard className="print:hidden">
        <p className="font-medium mb-4" style={{ color: "var(--text-primary)" }}>
          Fully paid. Thank you for working with OceanicCoder.
        </p>
        <PrintButton />
      </QuoteCard>
    );
  }
  if (!next) return null;
  // A one-stage quote is paid in full: no deposit, no balance to come.
  const single = quote.stages.length === 1;
  return (
    <QuoteCard className="print:hidden">
      <p
        className="font-mono text-[11px] uppercase tracking-[0.12em] mb-1"
        style={{ color: "var(--accent-teal)" }}
      >
        Next step
      </p>
      <p className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        {single
          ? "Your payment is ready"
          : next.index === 0
            ? "Your deposit is ready to pay"
            : `${next.label} is ready to pay`}
        : {formatMinor(next.amountMinor, quote.currency)}
      </p>
      <Link
        to={`/q/${token}/pay/${next.id}${query}`}
        className="inline-flex min-h-12 items-center px-6 rounded-xl font-semibold text-white"
        style={{ background: "var(--quote-cta)" }}
      >
        {single
          ? "Pay now"
          : next.index === 0
            ? "Pay the deposit"
            : `Pay the ${next.label.toLowerCase()}`}
      </Link>
      <PrintButton className="ml-3" />
    </QuoteCard>
  );
}

export default function QuotePage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  // ?preview=admin is the dashboard's Preview link; ?preview=1 only skips
  // recording the first view.
  const admin = params.get("preview") === "admin";
  const { state, reload, unlocked, setQuote, lock } = useClientQuote(token, {
    preview: params.get("preview") === "1",
    admin,
  });

  if (state.kind === "loading")
    return (
      <QuoteShell title="Your quote">
        <QuoteLoading />
      </QuoteShell>
    );
  if (state.kind === "inactive")
    return (
      <QuoteShell title="Link not active" width="narrow">
        <InactiveLink />
      </QuoteShell>
    );
  if (state.kind === "locked")
    return (
      <LockedQuote
        token={token}
        onUnlocked={unlocked}
        onRetry={reload}
        admin={admin}
        cookieBlocked={state.cookieBlocked}
      />
    );
  if (state.kind === "error")
    return (
      <QuoteShell title="Your quote">
        <QuoteError message={state.message} onRetry={reload} />
      </QuoteShell>
    );

  const { quote } = state;
  return (
    <QuoteShell title={`${quote.title} · ${quote.quoteNumber}`}>
      <JourneyBar quote={quote} />
      <StatusBanner quote={quote} />
      {quote.status === "accepted" && (
        <NextStep quote={quote} token={token} query={previewQuery(admin)} />
      )}
      <QuoteDocument quote={quote} />
      <StagePlan quote={quote} token={token} query={previewQuery(admin)} />
      <TermsAndNotes quote={quote} />
      {quote.status === "sent" &&
        (admin ? (
          // Only the client answers a quote; the server refuses it from a preview.
          <QuoteCard className="print:hidden">
            <p style={{ color: "var(--text-secondary)" }}>
              Preview only: your client accepts or declines the quote here.
            </p>
          </QuoteCard>
        ) : (
          <QuoteActions token={token} quote={quote} onChange={setQuote} onLocked={lock} />
        ))}
      <OptionalExtras quote={quote} money={(m) => formatMinor(m, quote.currency)} />
    </QuoteShell>
  );
}
