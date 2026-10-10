import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FaCheck, FaCreditCard, FaMobileAlt, FaApple, FaLock } from "react-icons/fa";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading, SectionLabel } from "./QuoteShell";
import InactiveLink from "./InactiveLink";
import { useClientQuote } from "./useClientQuote";
import { startStagePayment, checkStagePayment } from "@/services/api/quotes";
import { loadPaystackV2 } from "@/utils/paystackV2";
import { formatMinor } from "@/utils/quoteMath";
import type { PayMethod } from "@/types/quote";

const METHODS: { id: PayMethod; label: string; hint: string; Icon: typeof FaCreditCard }[] = [
  { id: "card", label: "Card", hint: "Visa, Mastercard, Verve", Icon: FaCreditCard },
  { id: "momo", label: "Mobile Money", hint: "MTN, Telecel, AirtelTigo", Icon: FaMobileAlt },
  { id: "apple_pay", label: "Apple Pay", hint: "Face ID or Touch ID", Icon: FaApple },
];
const APPLE_PAY = import.meta.env.VITE_APPLE_PAY_ENABLED === "true";
const TEST_MODE = String(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "").startsWith("pk_test_");

export default function CheckoutPage() {
  const { token = "", stageId = "" } = useParams();
  const navigate = useNavigate();
  const { state, reload } = useClientQuote(token, true);
  const [method, setMethod] = useState<PayMethod>("card");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const attemptRef = useRef<{ stopped: boolean } | null>(null);

  useEffect(() => {
    if (state.kind === "ok" && !email) setEmail(state.quote.clientEmail);
  }, [state, email]);
  useEffect(
    () => () => {
      if (attemptRef.current) attemptRef.current.stopped = true;
    },
    [],
  );

  if (state.kind === "loading")
    return (
      <QuoteShell title="Payment" width="wide">
        <QuoteLoading />
      </QuoteShell>
    );
  if (state.kind === "inactive")
    return (
      <QuoteShell title="Link not active" width="narrow">
        <InactiveLink />
      </QuoteShell>
    );
  if (state.kind === "error")
    return (
      <QuoteShell title="Payment">
        <QuoteError message={state.message} onRetry={reload} />
      </QuoteShell>
    );

  const { quote } = state;
  const stage = quote.stages.find((s) => s.id === stageId);
  if (!stage || stage.state !== "due" || quote.status !== "accepted")
    return <Navigate to={`/q/${token}`} replace />;

  const money = (m: number) => formatMinor(m, quote.currency);
  const methods = METHODS.filter((m) => m.id !== "apple_pay" || APPLE_PAY);
  const paidUrl = (reference: string) =>
    `/q/${token}/paid?reference=${encodeURIComponent(reference)}`;

  const onMethodKey = (e: KeyboardEvent) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = methods.findIndex((m) => m.id === method);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = methods[(i + step + methods.length) % methods.length];
    setMethod(next.id);
    requestAnimationFrame(() => document.getElementById(`pay-method-${next.id}`)?.focus());
  };

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    if (attemptRef.current) attemptRef.current.stopped = true;
    const attempt = { stopped: false };
    attemptRef.current = attempt;
    let started: Awaited<ReturnType<typeof startStagePayment>>;
    try {
      started = await startStagePayment({ token, stageId: stage.id, method, email: email.trim() });
    } catch (err) {
      if (attempt.stopped) return;
      setBusy(false);
      setNote({
        tone: "error",
        text: err instanceof Error ? err.message : "We couldn't start the payment.",
      });
      return;
    }
    // Safety net: if Paystack's success callback is slow or never fires, notice the payment ourselves.
    const watch = async (tries = 0): Promise<void> => {
      if (attempt.stopped || tries > 60) return;
      await new Promise((r) => setTimeout(r, 4000));
      if (attempt.stopped) return;
      const result = await checkStagePayment(token, started.reference).catch(() => null);
      if (attempt.stopped) return;
      if (result && result.state === "paid") {
        attempt.stopped = true;
        navigate(paidUrl(started.reference), { replace: true });
        return;
      }
      return watch(tries + 1);
    };
    void watch();
    try {
      const popup = await loadPaystackV2();
      if (attempt.stopped) return;
      popup.resumeTransaction(started.accessCode, {
        onSuccess: () => {
          if (attempt.stopped) return;
          attempt.stopped = true;
          navigate(paidUrl(started.reference), { replace: true });
        },
        onCancel: () => {
          if (attempt.stopped) return;
          attempt.stopped = true;
          setBusy(false);
          setNote({
            tone: "info",
            text: "Payment window closed. Nothing was charged. You can try again when you're ready.",
          });
        },
        onError: () => {
          if (attempt.stopped) return;
          attempt.stopped = true;
          setBusy(false);
          setNote({ tone: "error", text: "The payment window had a problem. Please try again." });
        },
      });
    } catch {
      // The popup script was blocked or offline: use Paystack's hosted page instead.
      attempt.stopped = true;
      window.location.assign(started.authorizationUrl);
    }
  };

  return (
    <QuoteShell title={`Pay ${stage.label} · ${quote.quoteNumber}`} width="wide">
      {TEST_MODE && (
        <div
          role="note"
          className="rounded-xl px-4 py-2 text-sm"
          style={{ background: "var(--status-pending-bg)", color: "var(--status-pending-text)" }}
        >
          Test mode: no real money will move.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <aside className="lg:sticky lg:top-6 quote-on-dark self-start rounded-2xl p-6 bg-[linear-gradient(135deg,#04333B_0%,#085866_100%)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7dd3e0]">
            {quote.quoteNumber} · {stage.invoiceNumber}
          </p>
          <p className="mt-2 text-white/75">{quote.title}</p>
          <p className="mt-4 text-sm text-white/75">
            {stage.label} ({stage.percent}%)
          </p>
          <p className=" text-3xl font-bold tabular-nums">{money(stage.amountMinor)}</p>
          <ol className="mt-6 space-y-2 text-sm">
            {quote.stages.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                  style={{
                    background:
                      s.state === "paid"
                        ? "#0C8599"
                        : s.id === stage.id
                          ? "#ffffff"
                          : "rgba(255,255,255,.15)",
                    color: s.id === stage.id ? "#0a0f1a" : "#fff",
                  }}
                >
                  {s.state === "paid" ? <FaCheck aria-hidden /> : s.index + 1}
                </span>
                <span className="flex-1">{s.label}</span>
                <span className=" tabular-nums">{money(s.amountMinor)}</span>
              </li>
            ))}
          </ol>
          <dl className="mt-6 border-t border-white/15 pt-4 text-sm tabular-nums space-y-1">
            <div className="flex justify-between">
              <dt className="text-white/75">Paid so far</dt>
              <dd>{money(quote.summary.paidMinor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/75">Balance after this payment</dt>
              <dd>{money(quote.summary.balanceMinor - stage.amountMinor)}</dd>
            </div>
          </dl>
        </aside>

        <QuoteCard>
          <form onSubmit={pay} className="space-y-5">
            <SectionLabel>Choose how to pay</SectionLabel>
            <div
              role="radiogroup"
              aria-label="Payment method"
              onKeyDown={onMethodKey}
              className="grid gap-3 sm:grid-cols-3"
            >
              {methods.map(({ id, label, hint, Icon }) => (
                <button
                  key={id}
                  id={`pay-method-${id}`}
                  type="button"
                  role="radio"
                  aria-checked={method === id}
                  tabIndex={method === id ? 0 : -1}
                  onClick={() => setMethod(id)}
                  className="rounded-xl border p-4 text-left transition"
                  style={{
                    borderColor: method === id ? "var(--accent-teal)" : "var(--border-subtle)",
                    background: method === id ? "var(--accent-teal-subtle)" : "transparent",
                  }}
                >
                  <Icon aria-hidden className="mb-2" style={{ color: "var(--accent-teal)" }} />
                  <span className="block font-semibold" style={{ color: "var(--text-primary)" }}>
                    {label}
                  </span>
                  <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                    {hint}
                  </span>
                </button>
              ))}
            </div>
            <div>
              <label
                htmlFor="pay-email"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Email for your receipt
              </label>
              <input
                id="pay-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full rounded-xl px-4 py-3"
              />
            </div>
            {note && (
              <p
                role={note.tone === "error" ? "alert" : "status"}
                className="text-sm"
                style={{
                  color:
                    note.tone === "error" ? "var(--status-failed-text)" : "var(--text-secondary)",
                }}
              >
                {note.text}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-12 py-3.5 rounded-xl font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--quote-cta)" }}
            >
              {busy ? "Waiting for Paystack…" : `Pay ${money(stage.amountMinor)}`}
            </button>
            <p
              className="flex items-center gap-2 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              <FaLock aria-hidden /> Paystack handles your card and Mobile Money details. We never
              see them.
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Prefer a bank transfer? Email{" "}
              <a
                className="underline"
                href={`mailto:hello@oceaniccoder.dev?subject=${encodeURIComponent(`Bank transfer for ${stage.invoiceNumber}`)}`}
              >
                hello@oceaniccoder.dev
              </a>{" "}
              and we'll send the details and confirm it by hand.
            </p>
          </form>
        </QuoteCard>
      </div>
    </QuoteShell>
  );
}
