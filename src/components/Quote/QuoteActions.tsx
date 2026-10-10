import { useState } from "react";
import { respondToQuote } from "@/services/api/quotes";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import type { ClientQuote } from "@/types/quote";

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
            className="flex items-start gap-3 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1"
            />
            I agree to the scope, payment plan and terms in this quote.
          </label>
          {error && (
            <p role="alert" className="text-sm" style={{ color: "var(--status-failed-text)" }}>
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || name.trim().length < 3 || !agree}
              className="min-h-12 px-6 rounded-xl font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--accent-teal)" }}
            >
              {busy ? "Accepting…" : "Accept quote"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-12 px-5 rounded-xl border"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              Print or save PDF
            </button>
            <a
              href={`mailto:${quote.contact.email}?subject=${encodeURIComponent(`Question about ${quote.quoteNumber}`)}`}
              className="min-h-12 px-5 rounded-xl border inline-flex items-center"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              Ask a question
            </a>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-12 px-5 rounded-xl border inline-flex items-center"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
              >
                WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => setDeclining(true)}
              className="min-h-12 px-5 text-sm underline"
              style={{ color: "var(--text-secondary)" }}
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
