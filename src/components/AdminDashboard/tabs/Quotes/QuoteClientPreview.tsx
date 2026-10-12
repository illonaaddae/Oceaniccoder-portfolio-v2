import { useCallback, useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { quoteAdmin } from "@/services/api/quotes";
import { formatMinor } from "@/utils/quoteMath";
import QuoteDocument, { TermsAndNotes } from "@/components/Quote/QuoteDocument";
import JourneyBar from "@/components/Quote/JourneyBar";
import StagePlan from "@/components/Quote/StagePlan";
import { OptionalExtras } from "@/components/Quote/ProposalSections";
import { StatusBanner } from "@/components/Quote/QuotePage";
import { QuoteCard, QuoteError, QuoteLoading, SectionLabel } from "@/components/Quote/QuoteShell";
import type { ClientQuote } from "@/types/quote";

/** Stands in for the accept/decline form, which can't be used from a preview. */
function DecisionPlaceholder() {
  return (
    <QuoteCard className="opacity-70">
      <SectionLabel>Your decision</SectionLabel>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Your client accepts or declines the quote here. This is turned off in the preview.
      </p>
    </QuoteCard>
  );
}

/**
 * Full-screen "Preview as client": the client quote page built from the
 * server's client view of the saved quote, for any status. Read-only: no
 * accept/decline form, and the payment buttons can't be clicked.
 */
export default function QuoteClientPreview({
  id,
  theme,
  unsaved = false,
  onClose,
}: {
  id: string;
  theme: string;
  /** The editor has changes that aren't saved, so they won't show here. */
  unsaved?: boolean;
  onClose: () => void;
}) {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; quote: ClientQuote }
  >({ kind: "loading" });
  const closeRef = useRef<HTMLButtonElement>(null);
  // Kept in a ref so a new onClose from the parent doesn't re-run the
  // focus and scroll-lock effect below.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { quote } = await quoteAdmin<{ quote: ClientQuote }>("clientView", { id });
      setState({ kind: "ready", quote });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Couldn't load the preview.",
      });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const quote = state.kind === "ready" ? state.quote : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Client preview"
      data-theme={theme === "light" ? "light" : "dark"}
      className="fixed inset-0 z-[150] flex flex-col"
    >
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-3 border-b"
        style={{
          background: "var(--status-pending-bg)",
          color: "var(--status-pending-text)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <p role="status" className="flex-1 min-w-[12rem] text-sm font-semibold">
          Preview — this is what your client sees. Nothing is sent.
          {unsaved && (
            <span className="block font-normal">
              Showing the last saved version. Save to include your latest changes.
            </span>
          )}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold"
          style={{ borderColor: "currentColor", color: "inherit" }}
        >
          <FaTimes aria-hidden /> Close preview
        </button>
      </div>
      <div className="quote-ui flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
          {state.kind === "loading" && <QuoteLoading />}
          {state.kind === "error" && <QuoteError message={state.message} onRetry={load} />}
          {quote && (
            <>
              <JourneyBar quote={quote} />
              <StatusBanner quote={quote} />
              <QuoteDocument quote={quote} />
              <StagePlan quote={quote} token="" preview />
              <TermsAndNotes quote={quote} />
              {(quote.status === "draft" || quote.status === "sent") && <DecisionPlaceholder />}
              <OptionalExtras quote={quote} money={(m) => formatMinor(m, quote.currency)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
