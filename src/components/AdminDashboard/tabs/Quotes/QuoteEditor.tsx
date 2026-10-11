import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { FaTimes } from "react-icons/fa";
import { quoteAdmin, QuoteApiError } from "@/services/api/quotes";
import { quoteToDraft, scheduleError } from "@/utils/quoteMath";
import {
  ClientStep,
  ContentStep,
  ItemsStep,
  StagesStep,
  TermsStep,
  ReviewStep,
  type StepProps,
} from "./editorSteps";
import type { QuoteDetailResponse, QuoteDraft } from "@/types/quote";

const STEPS: { label: string; Component: (p: StepProps) => JSX.Element; fields: string[] }[] = [
  {
    label: "Client",
    Component: ClientStep,
    fields: ["clientName", "clientEmail", "clientPhone", "clientCompany", "currency"],
  },
  {
    label: "Page content",
    Component: ContentStep,
    fields: ["title", "overview", "scope", "timeline"],
  },
  { label: "Line items", Component: ItemsStep, fields: ["items", "discountMinor"] },
  { label: "Payment stages", Component: StagesStep, fields: ["schedule"] },
  { label: "Terms", Component: TermsStep, fields: ["terms", "notes", "validDays"] },
  { label: "Review", Component: ReviewStep, fields: [] },
];

export default function QuoteEditor({
  quoteId,
  initial,
  onClose,
  onSaved,
}: {
  theme: string;
  quoteId?: string;
  initial?: Partial<QuoteDraft>;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [draft, setDraftState] = useState<QuoteDraft>(() => quoteToDraft(initial));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => {});

  const onValidity = useCallback((id: string, ok: boolean) => {
    setInvalid((prev) => {
      if (prev.has(id) === !ok) return prev;
      const next = new Set(prev);
      if (ok) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setDraft = (next: QuoteDraft) => {
    setDraftState(next);
    setDirty(true);
    // Server errors describe the old values; clear them once the user edits.
    setErrors({});
  };
  const hasInvalidInput = invalid.size > 0 || draft.items.some((it) => !(it.qty > 0));
  const { Component } = STEPS[step];
  const blocked = hasInvalidInput || (step === 3 && scheduleError(draft.schedule) !== null);

  const save = async () => {
    if (hasInvalidInput) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = quoteId
        ? await quoteAdmin<QuoteDetailResponse>("save", { id: quoteId, draft })
        : await quoteAdmin<QuoteDetailResponse>("create", { draft });
      setDirty(false);
      onSaved(result.quote.id);
    } catch (err) {
      if (err instanceof QuoteApiError && err.fields) {
        setErrors(err.fields);
        const first = STEPS.findIndex((s) =>
          s.fields.some((f) =>
            Object.keys(err.fields || {}).some((k) => k === f || k.startsWith(`${f}.`)),
          ),
        );
        if (first >= 0) setStep(first);
      }
      setMessage(err instanceof Error ? err.message : "Couldn't save the quote.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  };
  closeRef.current = close;

  // Escape closes (through the dirty guard), Tab stays inside the dialog, body scroll is
  // locked, and focus returns to whatever opened the editor.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = dialogRef.current;
    const focusables = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    (focusables().find((el) => el.tagName === "INPUT") ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (!root?.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-editor-title"
    >
      <div
        ref={dialogRef}
        className="glass-card w-full max-w-3xl rounded-2xl p-5 sm:p-6 my-8"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="quote-editor-title"
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {quoteId ? "Edit quote" : "New quote"}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close editor"
            className="p-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <FaTimes />
          </button>
        </div>
        <ol className="flex flex-wrap gap-2 mb-6">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className="rounded-full px-3 py-1 text-xs border"
                style={{
                  borderColor: i === step ? "var(--accent-teal)" : "var(--border-subtle)",
                  color: i === step ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {i + 1}. {s.label}
                {s.fields.some((f) =>
                  Object.keys(errors).some((k) => k === f || k.startsWith(`${f}.`)),
                ) && (
                  <span aria-label="has errors" style={{ color: "var(--status-failed-text)" }}>
                    {" "}
                    •
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
        <Component draft={draft} setDraft={setDraft} errors={errors} onValidity={onValidity} />
        {message && (
          <p role="alert" className="mt-4 text-sm" style={{ color: "var(--status-failed-text)" }}>
            {message}
          </p>
        )}
        <div
          className="flex flex-wrap justify-between gap-2 mt-6 border-t pt-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="px-4 py-2 rounded-lg border disabled:opacity-40"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || hasInvalidInput}
              onClick={() => void save()}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {busy ? "Saving…" : "Save draft"}
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                disabled={blocked}
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                }}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
