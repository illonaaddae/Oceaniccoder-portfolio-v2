import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaCopy,
  FaExternalLinkAlt,
  FaPaperPlane,
  FaWhatsapp,
} from "react-icons/fa";
import { quoteAdmin, QuoteApiError } from "@/services/api/quotes";
import {
  computeTotals,
  formatMinor,
  quoteToDraft,
  scheduleError,
  stageAmounts,
} from "@/utils/quoteMath";
import {
  ClientStep,
  ContentStep,
  ItemsStep,
  StagesStep,
  TermsStep,
  ReviewStep,
  BRAND_FILL,
  type StepProps,
} from "./editorSteps";
import { waLink } from "./QuoteDetail";
import type { QuoteDetailResponse, QuoteDraft } from "@/types/quote";

const STEPS: {
  label: string;
  hint: string;
  Component: (p: StepProps) => JSX.Element;
  fields: string[];
}[] = [
  {
    label: "Client",
    hint: "Who it's for",
    Component: ClientStep,
    fields: ["clientName", "clientEmail", "clientPhone", "clientCompany", "currency"],
  },
  {
    label: "Page content",
    hint: "What you'll build",
    Component: ContentStep,
    fields: ["title", "highlights", "overview", "scope", "timeline"],
  },
  {
    label: "Line items",
    hint: "What it costs",
    Component: ItemsStep,
    fields: ["items", "discountMinor", "discountLabel"],
  },
  { label: "Payment stages", hint: "When they pay", Component: StagesStep, fields: ["schedule"] },
  {
    label: "Terms",
    hint: "The small print",
    Component: TermsStep,
    fields: ["terms", "notes", "validDays"],
  },
  { label: "Review", hint: "Check and send", Component: ReviewStep, fields: [] },
];
const STAGES_STEP = 3;
const LAST = STEPS.length - 1;

const primaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold disabled:opacity-50";
// White is set inline, not with .text-white, because the light theme repaints
// that class with --text-primary (!important).
const primaryStyle = {
  background: `linear-gradient(135deg, ${BRAND_FILL} 0%, #0d7a6e 100%)`,
  color: "#fff",
};
const quietBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold disabled:opacity-40";
const quietStyle = { borderColor: "var(--border-subtle)", color: "var(--text-primary)" };

/** Full-page quote builder: step rail, form on the left, live summary on the right. */
export default function QuoteEditor({
  theme,
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
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(quoteId);
  const [sent, setSent] = useState<{ id: string; link?: string; emailed?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const topRef = useRef<HTMLDivElement>(null);

  const onValidity = useCallback((id: string, ok: boolean) => {
    setInvalid((prev) => {
      if (prev.has(id) === !ok) return prev;
      const next = new Set(prev);
      if (ok) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Each step starts at the top of the page, not wherever the last one ended.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    topRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [step, sent]);

  const setDraft = (next: QuoteDraft) => {
    setDraftState(next);
    setDirty(true);
    // Server errors describe the old values; clear them once the user edits.
    setErrors({});
  };
  const hasInvalidInput = invalid.size > 0 || draft.items.some((it) => !(it.qty > 0));
  const { Component } = STEPS[step];
  const blocked =
    hasInvalidInput || (step === STAGES_STEP && scheduleError(draft.schedule) !== null);
  const hasError = (fields: string[]) =>
    fields.some((f) => Object.keys(errors).some((k) => k === f || k.startsWith(`${f}.`)));

  /** Creates or updates the draft; returns its id, or null after showing what went wrong. */
  const persist = async (): Promise<string | null> => {
    try {
      const result = savedId
        ? await quoteAdmin<QuoteDetailResponse>("save", { id: savedId, draft })
        : await quoteAdmin<QuoteDetailResponse>("create", { draft });
      setDirty(false);
      setSavedId(result.quote.id);
      return result.quote.id;
    } catch (err) {
      if (err instanceof QuoteApiError && err.fields) {
        setErrors(err.fields);
        const at = STEPS.findIndex((s) =>
          s.fields.some((f) =>
            Object.keys(err.fields || {}).some((k) => k === f || k.startsWith(`${f}.`)),
          ),
        );
        if (at >= 0) setStep(at);
      }
      setMessage(err instanceof Error ? err.message : "Couldn't save the quote.");
      return null;
    }
  };

  const save = async () => {
    if (hasInvalidInput) return;
    setBusy("save");
    setMessage(null);
    const id = await persist();
    setBusy(null);
    if (id) onSaved(id);
  };

  const saveAndSend = async () => {
    if (hasInvalidInput) return;
    setBusy("send");
    setMessage(null);
    const id = await persist();
    if (!id) {
      setBusy(null);
      return;
    }
    try {
      const result = await quoteAdmin<QuoteDetailResponse>("send", { id });
      setSent({ id, link: result.link, emailed: result.emailed });
    } catch (err) {
      setMessage(
        `Saved as a draft, but it didn't send: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    } finally {
      setBusy(null);
    }
  };

  const close = () => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    if (savedId && savedId !== quoteId) onSaved(savedId);
    else onClose();
  };

  const firstName = draft.clientName.trim().split(/\s+/)[0] || "there";
  const shareText = sent?.link
    ? `Hi ${firstName}, here is your quote from OceanicCoder: ${sent.link}`
    : "";

  return (
    <div ref={topRef} className="space-y-6 scroll-mt-24">
      <div>
        <button
          type="button"
          onClick={close}
          className="mb-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          <FaArrowLeft aria-hidden /> All quotes
        </button>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {quoteId ? "Edit quote" : "New quote"}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {draft.title || "Fill in each step, then send it from Review."}
        </p>
      </div>

      {!sent && (
        <nav aria-label="Quote steps" className="glass-card rounded-2xl p-2">
          <ol className="grid grid-cols-6 gap-1">
            {STEPS.map((s, i) => {
              const on = i === step;
              const done = i < step;
              return (
                <li key={s.label} className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={on ? "step" : undefined}
                    aria-label={`${i + 1}. ${s.label}${hasError(s.fields) ? " (has errors)" : ""}`}
                    className="flex w-full items-center justify-center lg:justify-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-teal)]"
                    style={{ background: on ? "var(--bg-tertiary)" : "transparent" }}
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold"
                      style={
                        on
                          ? { background: BRAND_FILL, color: "#fff" }
                          : done
                            ? {
                                background: "var(--status-success-bg)",
                                color: "var(--status-success-text)",
                              }
                            : {
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-secondary)",
                              }
                      }
                    >
                      {done ? <FaCheck aria-hidden /> : i + 1}
                    </span>
                    <span className="hidden min-w-0 lg:block">
                      <span
                        className="block truncate text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {s.label}
                        {hasError(s.fields) && (
                          <span style={{ color: "var(--status-failed-text)" }}> •</span>
                        )}
                      </span>
                      <span
                        className="block truncate text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {s.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p
            className="px-3 pb-1 pt-2 text-sm font-semibold lg:hidden"
            style={{ color: "var(--text-primary)" }}
          >
            Step {step + 1} of {STEPS.length} · {STEPS[step].label}
          </p>
        </nav>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {sent ? (
            <SentPanel
              sent={sent}
              draft={draft}
              shareText={shareText}
              copied={copied}
              onCopy={async () => {
                try {
                  await navigator.clipboard.writeText(sent.link ?? "");
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              onDone={() => onSaved(sent.id)}
            />
          ) : (
            <section aria-labelledby="quote-step-title" className="glass-card rounded-2xl">
              <div className="p-5 sm:p-6">
                <h3
                  id="quote-step-title"
                  className="text-lg font-bold mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  {STEPS[step].label}
                </h3>
                <Component
                  draft={draft}
                  setDraft={setDraft}
                  errors={errors}
                  onValidity={onValidity}
                  theme={theme}
                />
                {message && (
                  <p
                    role="alert"
                    className="mt-4 text-sm"
                    style={{ color: "var(--status-failed-text)" }}
                  >
                    {message}
                  </p>
                )}
              </div>
              <div
                className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-2xl border-t px-5 py-3 sm:px-6"
                style={{ borderColor: "var(--border-subtle)", background: "inherit" }}
              >
                <div>
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className={quietBtn}
                      style={quietStyle}
                    >
                      <FaArrowLeft aria-hidden /> Back
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null || hasInvalidInput}
                    onClick={() => void save()}
                    className={quietBtn}
                    style={quietStyle}
                  >
                    {busy === "save" ? "Saving…" : "Save draft"}
                  </button>
                  {step < LAST ? (
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => setStep(step + 1)}
                      className={primaryBtn}
                      style={primaryStyle}
                    >
                      Next <FaArrowRight aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy !== null || hasInvalidInput}
                      onClick={() => void saveAndSend()}
                      className={primaryBtn}
                      style={primaryStyle}
                    >
                      <FaPaperPlane aria-hidden /> {busy === "send" ? "Sending…" : "Save and send"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
        <Summary draft={draft} />
      </div>
    </div>
  );
}

function Summary({ draft }: { draft: QuoteDraft }) {
  const totals = computeTotals(draft.items, draft.discountMinor);
  const stages = stageAmounts(totals.totalMinor, draft.schedule);
  const money = (m: number) => formatMinor(m, draft.currency);
  const row = "flex min-w-0 justify-between gap-3";
  return (
    <aside aria-label="Quote summary" className="min-w-0 xl:sticky xl:top-24 xl:self-start">
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="border-b p-5" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {draft.clientName || "No client yet"}
          </p>
          {draft.clientEmail && (
            <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
              {draft.clientEmail}
            </p>
          )}
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Total
          </p>
          <p
            className="text-3xl font-bold tabular-nums tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {money(totals.totalMinor)}
          </p>
        </div>
        <dl className="grid gap-2 p-5 text-sm">
          <div className={row}>
            <dt style={{ color: "var(--text-secondary)" }}>Subtotal</dt>
            <dd className="font-mono" style={{ color: "var(--text-primary)" }}>
              {money(totals.subtotalMinor)}
            </dd>
          </div>
          {draft.discountMinor > 0 && (
            <div className={row}>
              <dt style={{ color: "var(--text-secondary)" }}>Discount</dt>
              <dd className="font-mono" style={{ color: "var(--text-primary)" }}>
                −{money(draft.discountMinor)}
              </dd>
            </div>
          )}
          <div className="border-t pt-2 mt-1" style={{ borderColor: "var(--border-subtle)" }} />
          {stages.map((s, i) => (
            <div key={draft.schedule[i]?.id ?? i} className={row}>
              <dt className="min-w-0 truncate" style={{ color: "var(--text-secondary)" }}>
                {s.percent}% · {s.label || `Stage ${i + 1}`}
              </dt>
              <dd className="shrink-0 font-mono" style={{ color: "var(--text-primary)" }}>
                {money(s.amountMinor)}
              </dd>
            </div>
          ))}
          <div className={`${row} pt-1`}>
            <dt style={{ color: "var(--text-secondary)" }}>Valid for</dt>
            <dd style={{ color: "var(--text-primary)" }}>{draft.validDays} days</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

function SentPanel({
  sent,
  draft,
  shareText,
  copied,
  onCopy,
  onDone,
}: {
  sent: { id: string; link?: string; emailed?: boolean };
  draft: QuoteDraft;
  shareText: string;
  copied: boolean;
  onCopy: () => void;
  onDone: () => void;
}) {
  return (
    <section
      aria-labelledby="quote-sent-title"
      className="glass-card rounded-2xl p-5 sm:p-6 space-y-4"
    >
      <h3
        id="quote-sent-title"
        className="text-lg font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        Quote sent
      </h3>
      <p role="status" className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {sent.emailed === false
          ? `The email to ${draft.clientEmail} didn't go out. Share the link below yourself.`
          : `${draft.clientName || "Your client"} has an email with the link. Send it on WhatsApp too.`}
      </p>
      {sent.link && (
        <>
          <input
            aria-label="Quote link"
            readOnly
            value={sent.link}
            onFocus={(e) => e.target.select()}
            className="glass-input w-full rounded-lg px-3 py-2 text-sm font-mono"
          />
          <div className="flex flex-wrap gap-2">
            <a
              href={waLink(draft.clientPhone, shareText)}
              target="_blank"
              rel="noopener noreferrer"
              className={primaryBtn}
              style={primaryStyle}
            >
              <FaWhatsapp aria-hidden />
              {draft.clientPhone ? "Send on WhatsApp" : "Share on WhatsApp"}
            </a>
            <button type="button" onClick={onCopy} className={quietBtn} style={quietStyle}>
              {copied ? <FaCheck aria-hidden /> : <FaCopy aria-hidden />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              href={`${sent.link}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className={quietBtn}
              style={quietStyle}
            >
              <FaExternalLinkAlt aria-hidden /> Open as the client sees it
            </a>
          </div>
        </>
      )}
      <div className="border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
        <button type="button" onClick={onDone} className={quietBtn} style={quietStyle}>
          Done
        </button>
      </div>
    </section>
  );
}
