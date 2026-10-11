import { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaEye } from "react-icons/fa";
import { quoteAdmin } from "@/services/api/quotes";
import { formatDate, formatMinor, quoteToDraft } from "@/utils/quoteMath";
import { FilterPills } from "@/components/ui/FilterPills";
import QuoteDetail from "./QuoteDetail";
import QuoteEditor from "./QuoteEditor";
import { clearPendingQuoteDraft, peekPendingQuoteDraft } from "./quoteHandoff";
import type { QuoteDetailResponse, QuoteDraft, QuoteStatus, QuoteSummary } from "@/types/quote";

type Filter = "all" | QuoteStatus;
const FILTERS: Filter[] = ["all", "draft", "sent", "accepted", "declined", "expired", "cancelled"];

export default function QuotesTab({ theme }: { theme: string }) {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; draft?: Partial<QuoteDraft> } | null>(
    () => {
      const handed = peekPendingQuoteDraft();
      return handed ? { draft: handed } : null;
    },
  );
  useEffect(() => clearPendingQuoteDraft(), []);

  const load = useCallback(async () => {
    try {
      const { quotes: list } = await quoteAdmin<{ quotes: QuoteSummary[] }>("list");
      setQuotes(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load quotes.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(
    () => (filter === "all" ? quotes : quotes.filter((q) => q.status === filter)),
    [quotes, filter],
  );

  const openEditor = (d?: QuoteDetailResponse) =>
    setEditing(d ? { id: d.quote.id, draft: quoteToDraft(d.quote) } : {});

  // The editor takes over the tab as a full page; the list comes back on close.
  if (editing)
    return (
      <QuoteEditor
        theme={theme}
        quoteId={editing.id}
        initial={editing.draft}
        onClose={() => setEditing(null)}
        onSaved={(id) => {
          setEditing(null);
          setSelected(id);
          void load();
        }}
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Quotes
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Send a quote, collect the deposit, request the balance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
        >
          <FaPlus /> New quote
        </button>
      </div>

      <FilterPills
        tabs={FILTERS.map((f) => ({
          key: f,
          label: f === "all" ? "All" : f[0].toUpperCase() + f.slice(1),
          count: f === "all" ? quotes.length : quotes.filter((q) => q.status === f).length,
        }))}
        active={filter}
        onChange={(k) => setFilter(k as Filter)}
        theme={theme === "light" ? "light" : "dark"}
      />

      {error && (
        <p role="alert" style={{ color: "var(--status-failed-text)" }}>
          {error}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <ul className="space-y-3">
          {loading && <li style={{ color: "var(--text-secondary)" }}>Loading…</li>}
          {!loading && shown.length === 0 && (
            <li style={{ color: "var(--text-secondary)" }}>No quotes here yet.</li>
          )}
          {shown.map((q) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => setSelected(q.id)}
                className="glass-card w-full rounded-xl p-4 text-left transition"
                style={{ outline: selected === q.id ? "2px solid var(--accent-teal)" : "none" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {q.title}
                  </span>
                  <span
                    className="text-xs rounded-full px-2 py-0.5 border"
                    style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
                  >
                    {q.status}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {q.quoteNumber} · {q.clientName}
                  {q.viewedAt && (
                    <FaEye
                      className="inline ml-2"
                      title={`Viewed ${formatDate(q.viewedAt)}`}
                      aria-label="Viewed"
                    />
                  )}
                </p>
                <p className="text-sm font-mono mt-1" style={{ color: "var(--text-primary)" }}>
                  {formatMinor(q.paidMinor, q.currency)} of {formatMinor(q.totalMinor, q.currency)}
                  {q.complete && " · fully paid"}
                  {q.nextDue && (
                    <span
                      style={{
                        color: q.nextDue.overdue
                          ? "var(--status-failed-text)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {" "}
                      · Next: {q.nextDue.label}
                      {q.nextDue.overdue ? " (overdue)" : ""}
                    </span>
                  )}
                </p>
              </button>
            </li>
          ))}
        </ul>
        {selected && (
          <QuoteDetail
            key={selected}
            id={selected}
            onClose={() => setSelected(null)}
            onEdit={(d) => openEditor(d)}
            onChanged={() => void load()}
          />
        )}
      </div>
    </div>
  );
}
