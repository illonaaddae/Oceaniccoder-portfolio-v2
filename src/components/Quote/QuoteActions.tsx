import { useState } from "react";
import { FaCheck } from "react-icons/fa";
import { respondToQuote } from "@/services/api/quotes";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import type { ClientQuote } from "@/types/quote";

const SECONDARY =
  "inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-[var(--accent-teal)] underline-offset-4 hover:underline hover:bg-[var(--bg-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-teal)]";

export default function QuoteActions({
  token,
  quote,
  onChange,
}: {
  token: string;
  quote: ClientQuote;
  onChange: (q: ClientQuote) => void;
}) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (body: Parameters<typeof respondToQuote>[1]) => {
    setBusy(true);
    setError(null);
    try {
      const { quote: updated } = await respondToQuote(token, body);
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const whatsapp = quote.contact.whatsapp
    ? `https://wa.me/${quote.contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I have a question about quote ${quote.quoteNumber}.`)}`
    : null;

  return (
    <QuoteCard className="print:hidden">
      <SectionLabel>Your decision</SectionLabel>
      {!declining ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit({ action: "accept", name: name.trim(), agree });
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="accept-name"
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              Type your full name to accept
            </label>
            <input
              id="accept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="glass-input w-full rounded-xl px-4 py-3"
              placeholder={quote.clientName}
            />
          </div>
          <label
            className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors"
            style={{
              borderColor: agree ? "var(--quote-cta)" : "var(--border-subtle)",
              background: agree ? "var(--accent-teal-subtle)" : "transparent",
            }}
          >
            {/* Native input kept for keyboard and screen readers; only its look is replaced. */}
            <span className="relative mt-0.5 h-6 w-6 shrink-0">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="peer absolute inset-0 m-0 h-6 w-6 appearance-none rounded-md border-2 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]"
                style={{
                  borderColor: agree ? "var(--quote-cta)" : "var(--text-secondary)",
                  background: agree ? "var(--quote-cta)" : "var(--bg-secondary)",
                }}
              />
              <FaCheck
                aria-hidden
                className="pointer-events-none absolute inset-0 m-auto h-3 w-3 opacity-0 transition-opacity peer-checked:opacity-100"
                style={{ color: "#ffffff" }}
              />
            </span>
            <span className="text-[15px] leading-snug" style={{ color: "var(--text-primary)" }}>
              I agree to the scope, payment plan and terms in this quote.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm" style={{ color: "var(--status-failed-text)" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || name.trim().length < 3 || !agree}
            className="w-full sm:w-auto min-h-12 px-8 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]"
            style={{ background: "var(--quote-cta)" }}
          >
            {busy ? "Accepting…" : "Accept quote"}
          </button>
          <div
            className="flex flex-wrap items-center gap-x-1 gap-y-2 pt-4 border-t text-sm"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span className="mr-2" style={{ color: "var(--text-secondary)" }}>
              Not ready yet?
            </span>
            <button type="button" onClick={() => window.print()} className={SECONDARY}>
              Print or save PDF
            </button>
            <a
              href={`mailto:${quote.contact.email}?subject=${encodeURIComponent(`Question about ${quote.quoteNumber}`)}`}
              className={SECONDARY}
            >
              Ask a question
            </a>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
                WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => setDeclining(true)}
              className={`${SECONDARY} sm:ml-auto`}
              style={{ color: "var(--status-failed-text)" }}
            >
              Decline
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit({ action: "decline", reason: reason.trim() });
          }}
          className="space-y-4"
        >
          <label
            htmlFor="decline-reason"
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Anything we should know? (optional)
          </label>
          <textarea
            id="decline-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="glass-input w-full rounded-xl px-4 py-3"
          />
          {error && (
            <p role="alert" className="text-sm" style={{ color: "var(--status-failed-text)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 px-6 rounded-xl font-semibold border"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {busy ? "Sending…" : "Decline quote"}
            </button>
            <button
              type="button"
              onClick={() => setDeclining(false)}
              className="min-h-12 px-5 text-sm underline"
              style={{ color: "var(--text-secondary)" }}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </QuoteCard>
  );
}
