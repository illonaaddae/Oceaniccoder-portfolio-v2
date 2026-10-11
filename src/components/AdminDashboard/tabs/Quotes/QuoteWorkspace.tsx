import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { quoteAdmin } from "@/services/api/quotes";
import { quoteToDraft } from "@/utils/quoteMath";
import QuoteEditor, { Summary } from "./QuoteEditor";
import QuoteSidebar from "./QuoteSidebar";
import type { QuoteDetailResponse, QuoteDraft, QuoteStatus } from "@/types/quote";

const PILL: Record<QuoteStatus, { background: string; color: string }> = {
  draft: { background: "var(--bg-tertiary)", color: "var(--text-secondary)" },
  sent: { background: "var(--status-pending-bg)", color: "var(--status-pending-text)" },
  accepted: { background: "var(--status-success-bg)", color: "var(--status-success-text)" },
  declined: { background: "var(--status-failed-bg)", color: "var(--status-failed-text)" },
  expired: { background: "var(--bg-tertiary)", color: "var(--text-secondary)" },
  cancelled: { background: "var(--bg-tertiary)", color: "var(--text-secondary)" },
};

/**
 * One page per quote. A draft is the editable stepper; any other status shows
 * the same sections read-only. The sidebar carries the status, client link,
 * payment stages and actions, and stays put when the page switches mode.
 */
export default function QuoteWorkspace({
  id,
  theme,
  onBack,
}: {
  id: string;
  theme: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<QuoteDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<{ draft: QuoteDraft; dirty: boolean } | null>(null);
  // Keeps the editor (and its "Quote sent" panel) up after Save and send.
  const [showSent, setShowSent] = useState(false);
  // Bumped when a sidebar action changes the status, so the editor starts
  // again from the server's copy (e.g. after Revise).
  const [generation, setGeneration] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await quoteAdmin<QuoteDetailResponse>("get", { id }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the quote.");
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const onChange = useCallback((draft: QuoteDraft, dirty: boolean) => {
    setLive({ draft, dirty });
  }, []);

  const editable = data ? data.quote.status === "draft" || showSent : false;
  const dirty = editable && !!live?.dirty;

  const back = () => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onBack();
  };

  const quote = data?.quote;
  const summaryDraft = data ? (editable && live ? live.draft : quoteToDraft(data.quote)) : null;

  return (
    <div className="space-y-6">
      {/* The back button keeps one place in the tree so it survives the load. */}
      <div>
        <button
          type="button"
          onClick={back}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          <FaArrowLeft aria-hidden /> All quotes
        </button>
        {quote && (
          <>
            <p className="mt-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
              <span>{quote.quoteNumber}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h2
                className="min-w-0 break-words text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {quote.title || "Untitled quote"}
              </h2>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                style={PILL[quote.status] ?? PILL.draft}
              >
                {quote.status}
              </span>
            </div>
          </>
        )}
      </div>

      {!data || !quote || !summaryDraft ? (
        <div className="glass-card rounded-2xl p-6">
          {error ? (
            <p role="alert" style={{ color: "var(--status-failed-text)" }}>
              {error}
            </p>
          ) : (
            <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <QuoteEditor
              key={`${generation}-${editable ? "edit" : "view"}`}
              theme={theme}
              quoteId={quote.id}
              initial={quoteToDraft(quote)}
              embedded={editable}
              readOnly={!editable}
              onChange={onChange}
              onClose={back}
              onSent={() => {
                setShowSent(true);
                void load();
              }}
              onSaved={() => {
                setShowSent(false);
                void load();
              }}
            />
          </div>
          <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <Summary draft={summaryDraft} sticky={false} />
            <QuoteSidebar
              key={quote.id}
              data={data}
              theme={theme}
              sendBlocked={dirty}
              onChanged={(next) => {
                if (next.quote.status !== quote.status) {
                  setShowSent(false);
                  setGeneration((g) => g + 1);
                }
                setData(next);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
