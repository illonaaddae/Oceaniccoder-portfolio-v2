import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheck,
  FaCreditCard,
  FaMobileAlt,
  FaApple,
  FaLock,
  FaUniversity,
  FaWhatsapp,
  FaEnvelope,
} from "react-icons/fa";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading, SectionLabel } from "./QuoteShell";
import InactiveLink from "./InactiveLink";
import { LockedQuote } from "./QuoteAccessGate";
import AnimatedCard from "@/components/Payment/AnimatedCard";
import { CopyButton } from "@/components/Payment/BankTransfer";
import MomoNetworkPicker, { type MomoNetwork } from "@/components/Payment/MomoNetworkPicker";
import { previewQuery, useClientQuote } from "./useClientQuote";
import { startStagePayment, checkStagePayment, isLockedError } from "@/services/api/quotes";
import { loadPaystackV2 } from "@/utils/paystackV2";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import { PAYMENT_CONFIG } from "@/config/payment";
import type { PayMethod } from "@/types/quote";

/** Bank transfer is settled by hand, so it never reaches Paystack. */
type UiMethod = PayMethod | "bank";

const METHODS: { id: UiMethod; label: string; hint: string; Icon: typeof FaCreditCard }[] = [
  { id: "card", label: "Card", hint: "Visa, Mastercard, Verve", Icon: FaCreditCard },
  { id: "momo", label: "Mobile Money", hint: "MTN, Telecel, AirtelTigo", Icon: FaMobileAlt },
  { id: "apple_pay", label: "Apple Pay", hint: "Face ID or Touch ID", Icon: FaApple },
  { id: "bank", label: "Bank transfer", hint: "We send the details", Icon: FaUniversity },
];
const APPLE_PAY = import.meta.env.VITE_APPLE_PAY_ENABLED === "true";
/** When to offer Paystack's own page, and when to go there, if its window never shows. */
const SLOW_WINDOW_MS = 3000;
const HOSTED_FALLBACK_MS = 8000;
const TEST_MODE = String(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "").startsWith("pk_test_");

export default function CheckoutPage() {
  const { token = "", stageId = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const admin = params.get("preview") === "admin";
  const query = previewQuery(admin);
  const { state, reload, unlocked, lock } = useClientQuote(token, { preview: true, admin });
  const [method, setMethod] = useState<UiMethod>("card");
  const [network, setNetwork] = useState<MomoNetwork | null>(null);
  const [email, setEmail] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [lastRef, setLastRef] = useState<string | null>(null);
  // Paystack's own page, offered when its checkout window is slow to appear.
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const attemptRef = useRef<{ stopped: boolean } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.kind === "ok" && !email) setEmail(state.quote.clientEmail);
  }, [state, email]);
  // Focus the email field once the client asks to change it.
  useEffect(() => {
    if (editingEmail) emailRef.current?.focus();
  }, [editingEmail]);
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
      <QuoteShell title="Payment">
        <QuoteError message={state.message} onRetry={reload} />
      </QuoteShell>
    );

  const { quote } = state;
  const stage = quote.stages.find((s) => s.id === stageId);
  if (!stage || stage.state !== "due" || quote.status !== "accepted")
    return <Navigate to={`/q/${token}${query}`} replace />;

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
    if (method === "bank") return;
    // The server has no admin bypass for paying; say so instead of a lock screen.
    if (admin) {
      setNote({ tone: "info", text: "Preview only: payments are turned off here." });
      return;
    }
    if (method === "momo" && !network) {
      setNote({ tone: "error", text: "Choose your Mobile Money network first." });
      return;
    }
    setBusy(true);
    setNote(null);
    setHostedUrl(null);
    if (attemptRef.current) attemptRef.current.stopped = true;
    const attempt = { stopped: false };
    attemptRef.current = attempt;
    let started: Awaited<ReturnType<typeof startStagePayment>>;
    try {
      started = await startStagePayment({
        token,
        stageId: stage.id,
        method,
        email: email.trim(),
        ...(method === "momo" && network ? { network } : {}),
      });
    } catch (err) {
      if (attempt.stopped) return;
      setBusy(false);
      // The unlock ended while the page was open (New link, Revise, 30 days).
      if (isLockedError(err)) {
        lock();
        return;
      }
      setNote({
        tone: "error",
        text: err instanceof Error ? err.message : "We couldn't start the payment.",
      });
      return;
    }
    setLastRef(started.reference);
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
    // Privacy browsers can block Paystack's checkout window after its script
    // loads, and then no callback ever fires. Unless Paystack says the window
    // loaded, offer its own page after a moment and go there after a while.
    // The clock starts before the script loads, so a stalled load is covered too.
    let loaded = false;
    const timers = [
      setTimeout(() => {
        if (!attempt.stopped && !loaded) setHostedUrl(started.authorizationUrl);
      }, SLOW_WINDOW_MS),
      setTimeout(() => {
        if (attempt.stopped || loaded) return;
        attempt.stopped = true;
        window.location.assign(started.authorizationUrl);
      }, HOSTED_FALLBACK_MS),
    ];
    const settle = () => {
      loaded = true;
      timers.forEach(clearTimeout);
      setHostedUrl(null);
    };
    try {
      const popup = await loadPaystackV2();
      if (attempt.stopped) return;
      popup.resumeTransaction(started.accessCode, {
        onLoad: settle,
        onSuccess: () => {
          settle();
          if (attempt.stopped) return;
          attempt.stopped = true;
          navigate(paidUrl(started.reference), { replace: true });
        },
        onCancel: () => {
          settle();
          if (attempt.stopped) return;
          attempt.stopped = true;
          setBusy(false);
          setNote({
            tone: "info",
            text: "Payment window closed. Nothing was charged. You can try again when you're ready.",
          });
        },
        onError: () => {
          settle();
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

  // For when the payment window closed oddly: look the payment up ourselves.
  const recheck = async () => {
    if (!lastRef) return;
    setBusy(true);
    const result = await checkStagePayment(token, lastRef).catch(() => null);
    setBusy(false);
    if (result && result.state === "paid") {
      navigate(paidUrl(lastRef), { replace: true });
      return;
    }
    setNote({
      tone: "info",
      text: "We haven't seen the payment yet. If you were charged, give it a minute and check again.",
    });
  };

  const first = (quote.clientName || "").trim().split(" ")[0];
  const stageNo = quote.stages.findIndex((s) => s.id === stage.id) + 1;
  const nextStage = quote.stages.find((s) => s.index > stage.index && s.state !== "paid");
  const whatsapp = quote.contact.whatsapp
    ? `https://wa.me/${quote.contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I'd like to pay ${stage.invoiceNumber} (${money(stage.amountMinor)}) by bank transfer.`,
      )}`
    : "";
  const mailto = `mailto:${quote.contact.email || "hello@oceaniccoder.dev"}?subject=${encodeURIComponent(
    `Bank transfer for ${stage.invoiceNumber}`,
  )}`;

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
        {/* Ocean header for what's being paid now, white body for the plan and
            totals, like the receipt. */}
        <aside
          className="lg:sticky lg:top-6 self-start overflow-hidden rounded-2xl border"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
        >
          <div className="quote-on-dark p-6 bg-[linear-gradient(135deg,#04333B_0%,#085866_100%)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8dd7e7]">
              You're paying · Stage {stageNo} of {quote.stages.length}
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums">{money(stage.amountMinor)}</p>
            <p className="mt-1 text-sm text-white/80">
              {stage.label} · {stage.percent}% of {money(quote.totalMinor)}
            </p>
            {stage.dueBy && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5">
                  Due {formatDate(stage.dueBy)}
                </span>
                {stage.overdue && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[#04333B]">
                    Overdue
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="p-6 space-y-6 text-sm">
            <dl className="space-y-2">
              {[
                ["Invoice", stage.invoiceNumber],
                ["Project", quote.title],
                [
                  "Billed to",
                  quote.clientName
                    ? `${quote.clientName}${quote.clientCompany ? `, ${quote.clientCompany}` : ""}`
                    : "",
                ],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt style={{ color: "var(--text-secondary)" }}>{label}</dt>
                    <dd className="text-right font-medium" style={{ color: "var(--text-primary)" }}>
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>

            <div>
              <p
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--accent-teal)" }}
              >
                Payment plan
              </p>
              <ol className="mt-3" aria-label="Payment stages">
                {quote.stages.map((s, i) => {
                  const current = s.id === stage.id;
                  const paid = s.state === "paid";
                  const isNext = nextStage?.id === s.id;
                  const last = i === quote.stages.length - 1;
                  return (
                    <li
                      key={s.id}
                      aria-current={current ? "step" : undefined}
                      className="relative flex gap-3 pb-4 last:pb-0"
                    >
                      {!last && (
                        <span
                          aria-hidden
                          className="absolute left-3 top-6 bottom-0 w-px"
                          style={{ background: "var(--border-subtle)" }}
                        />
                      )}
                      <span
                        className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                        style={{
                          background: paid || current ? "#085866" : "var(--bg-primary)",
                          color: paid || current ? "#ffffff" : "var(--text-secondary)",
                          border: paid || current ? "none" : "1px solid var(--border-subtle)",
                        }}
                      >
                        {paid ? <FaCheck aria-hidden /> : s.index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <span
                            className={current ? "font-semibold" : ""}
                            style={{ color: "var(--text-primary)" }}
                          >
                            {s.label}
                          </span>
                          <span className="tabular-nums" style={{ color: "var(--text-primary)" }}>
                            {money(s.amountMinor)}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {paid
                            ? `Paid${s.paidAt ? ` ${formatDate(s.paidAt)}` : ""}`
                            : current
                              ? "Paying now"
                              : isNext
                                ? "Next · we'll email you a payment link when it's due"
                                : "Later"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <dl
              className="space-y-1.5 border-t pt-4 tabular-nums"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex justify-between">
                <dt style={{ color: "var(--text-secondary)" }}>Quote total</dt>
                <dd style={{ color: "var(--text-primary)" }}>{money(quote.totalMinor)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--text-secondary)" }}>Paid so far</dt>
                <dd style={{ color: "var(--text-primary)" }}>{money(quote.summary.paidMinor)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt style={{ color: "var(--text-primary)" }}>Left after this payment</dt>
                <dd style={{ color: "var(--text-primary)" }}>
                  {money(quote.summary.balanceMinor - stage.amountMinor)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <QuoteCard>
          <form onSubmit={pay} className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                Pay the {stage.label.toLowerCase()}
                {first ? `, ${first}` : ""}
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                Choose how you'd like to pay. You can pay from anywhere, in{" "}
                {quote.currency === "GHS" ? "Ghana cedis" : "US dollars"}.
              </p>
            </div>
            <SectionLabel>Choose how to pay</SectionLabel>
            <div
              role="radiogroup"
              aria-label="Payment method"
              onKeyDown={onMethodKey}
              className="grid grid-cols-2 gap-3"
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
                    borderColor: method === id ? "var(--quote-cta)" : "var(--border-subtle)",
                    background: method === id ? "var(--quote-cta)" : "transparent",
                  }}
                >
                  {/* The picked method is a solid brand block, as on Craigtec. */}
                  <Icon
                    aria-hidden
                    className="mb-2"
                    style={{ color: method === id ? "#ffffff" : "var(--accent-teal)" }}
                  />
                  <span
                    className="block font-semibold"
                    style={{ color: method === id ? "#ffffff" : "var(--text-primary)" }}
                  >
                    {label}
                  </span>
                  <span
                    className="block text-xs"
                    style={{
                      color: method === id ? "rgba(255,255,255,0.8)" : "var(--text-secondary)",
                    }}
                  >
                    {hint}
                  </span>
                </button>
              ))}
            </div>
            {method === "momo" && (
              <div className="space-y-2">
                <MomoNetworkPicker
                  value={network}
                  onChange={(n) => {
                    setNetwork(n);
                    setNote(null);
                  }}
                />
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {network
                    ? `Paystack's secure window asks for your number. Then approve ${money(stage.amountMinor)} on your phone.`
                    : "Choose your network, then tap Pay."}
                </p>
              </div>
            )}
            {/* The same card preview the invoice pay page uses, shown while Card is picked. */}
            {method === "card" && (
              <div className="py-2" aria-hidden>
                <AnimatedCard
                  variant="brand"
                  amount={money(stage.amountMinor)}
                  holder={quote.clientName}
                  reference={{ label: "Quote", value: quote.quoteNumber }}
                />
              </div>
            )}
            {method === "bank" ? (
              <div
                className="rounded-xl border p-4 space-y-3 text-sm"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                <dl className="space-y-2">
                  {[
                    ["Bank", PAYMENT_CONFIG.bankName],
                    ["Account name", PAYMENT_CONFIG.bankAccountName],
                    ["Account number", PAYMENT_CONFIG.bankAccountNumber],
                    ["Sort code", PAYMENT_CONFIG.bankSortCode],
                    ["Amount", money(stage.amountMinor)],
                    ["Reference", stage.invoiceNumber],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <dt>{label}</dt>
                        <dd className="flex items-center gap-2 font-semibold tabular-nums">
                          <span style={{ color: "var(--text-primary)" }}>{value}</span>
                          {label !== "Bank" && label !== "Account name" && (
                            <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} />
                          )}
                        </dd>
                      </div>
                    ))}
                </dl>
                <p>
                  Use{" "}
                  <strong style={{ color: "var(--text-primary)" }}>{stage.invoiceNumber}</strong> as
                  the reference. Once the money arrives we record it and email your receipt. Send us
                  a message after you pay so we can look out for it.
                </p>
                <div className="flex flex-wrap gap-2">
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-white"
                      style={{ background: "var(--quote-cta)" }}
                    >
                      <FaWhatsapp aria-hidden /> Message on WhatsApp
                    </a>
                  )}
                  <a
                    href={mailto}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold"
                    style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                  >
                    <FaEnvelope aria-hidden /> Email us
                  </a>
                </div>
              </div>
            ) : (
              <>
                {/* Paystack needs an email for every payment; it's the quote's email
                    unless someone else is paying and wants the receipt. */}
                {editingEmail || !email ? (
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
                      ref={emailRef}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input w-full rounded-xl px-4 py-3"
                    />
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Receipt goes to{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{email}</strong> ·{" "}
                    <button
                      type="button"
                      onClick={() => setEditingEmail(true)}
                      className="font-semibold underline underline-offset-2"
                      style={{ color: "var(--accent-teal)" }}
                    >
                      Change
                    </button>
                  </p>
                )}
                {note && (
                  <p
                    role={note.tone === "error" ? "alert" : "status"}
                    className="text-sm"
                    style={{
                      color:
                        note.tone === "error"
                          ? "var(--status-failed-text)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {note.text}
                    {lastRef && (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => void recheck()}
                          disabled={busy}
                          className="font-semibold underline underline-offset-2"
                          style={{ color: "var(--text-primary)" }}
                        >
                          I've paid, check now
                        </button>
                      </>
                    )}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full min-h-12 py-3.5 rounded-xl font-semibold text-white disabled:opacity-60"
                  style={{ background: "var(--quote-cta)" }}
                >
                  {busy ? "Opening the secure window…" : `Pay ${money(stage.amountMinor)}`}
                </button>
                {busy && hostedUrl && (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Taking a while?{" "}
                    <a
                      href={hostedUrl}
                      className="font-semibold underline underline-offset-2"
                      style={{ color: "var(--accent-teal)" }}
                    >
                      Open Paystack's secure page
                    </a>
                  </p>
                )}
                <p
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <FaLock aria-hidden /> Paystack handles your card and Mobile Money details. We
                  never see them.
                </p>
              </>
            )}
            <Link
              to={`/q/${token}${query}`}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              <FaArrowLeft aria-hidden /> Back to the quote
            </Link>
          </form>
        </QuoteCard>
      </div>
    </QuoteShell>
  );
}
