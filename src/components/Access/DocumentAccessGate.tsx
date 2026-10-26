import { useCallback, useEffect, useRef, useState, type ComponentRef, type FormEvent } from "react";
import { QuoteCard, QuoteError, QuoteLoading } from "@/components/Quote/QuoteShell";
import type { AccessTarget } from "@/services/api/access";
import { QuoteApiError } from "@/services/api/quotes";
import type { DocumentKind } from "@/utils/linkCode";

// The code screen for a client document link (quote, invoice, receipt)
// opened in a browser with no unlock (docs/plans/2026-10-20-quote-access-code.md,
// docs/plans/2026-10-25-invoice-receipt-access-codes.md 8.6). It asks for a
// code by itself once the page is visible, so the client only has to type it
// in. It shows no client name or amounts.

const CONTACT = "hello@oceaniccoder.dev";
const BLOCKED = `Too many wrong codes were entered on this link, so no more codes will be sent. Contact ${CONTACT} for a new link.`;
const COOKIE_BLOCKED =
  "Your browser didn't keep the sign-in. Allow cookies for oceaniccoder.dev and try again.";

interface AccessCopy {
  title: string;
  intro: string;
  submit: string;
  noEmail: string;
  loadError: string;
  loading: string;
  mailSubject: string;
  /** Where the code went when the server shows no masked address. */
  recipient: string;
}

const copyFor = (noun: string, Noun: string): AccessCopy => ({
  title: `Open your ${noun}`,
  intro: `To keep your ${noun} private, it opens with a code we email to you.`,
  submit: `Open ${noun}`,
  noEmail: `This ${noun} can't be opened with a code. Contact ${CONTACT} to open it.`,
  loadError: `We couldn't open the ${noun}. Please try again.`,
  loading: `Loading your ${noun}…`,
  mailSubject: `${Noun} link`,
  recipient: `the email address we sent the ${noun} to`,
});

/** The words for each kind of document; the quote's are the ones its page has always used. */
export const ACCESS_COPY: Record<DocumentKind, AccessCopy> = {
  quote: copyFor("quote", "Quote"),
  invoice: copyFor("invoice", "Invoice"),
  receipt: copyFor("receipt", "Receipt"),
};

// One automatic code email per link per page load, however often the screen
// mounts (StrictMode, moving between the quote and pay pages). Resend is the
// client's own choice after that.
const autoSent = new Set<string>();

// The challenge for the code that was emailed, kept per link for this tab so
// a refresh doesn't lose it. sessionStorage can throw (Safari private mode,
// storage blocked); then a refresh just asks for a new code. Quotes keep the
// key they had before the gate was shared, so a tab open across the deploy
// keeps its code.
const storageKey = ({ kind, key }: AccessTarget) =>
  kind === "quote" ? `oc-quote-code:${key}` : `oc-access:${kind}:${key}`;

function readChallenge(target: AccessTarget): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(target)) || "null");
    if (saved && typeof saved.challenge === "string" && saved.expiresAt > Date.now())
      return saved.challenge;
  } catch {
    return null;
  }
  return null;
}

function saveChallenge(target: AccessTarget, challenge: string | null, expiresInSeconds = 0) {
  try {
    if (challenge)
      sessionStorage.setItem(
        storageKey(target),
        JSON.stringify({ challenge, expiresAt: Date.now() + expiresInSeconds * 1000 }),
      );
    else sessionStorage.removeItem(storageKey(target));
  } catch {
    // See readChallenge: without storage the code still works in this page.
  }
}

const digits = (text: string) => text.replace(/\D/g, "").slice(0, 6);
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

type Screen =
  | { kind: "checking" }
  | { kind: "entry" }
  /** announce: it replaced the form after an answer, so say it and move focus there. */
  | { kind: "contact"; message: string; announce: boolean }
  | { kind: "error"; message: string };

function ContactUs({
  message,
  announce,
  mailSubject,
}: {
  message: string;
  announce: boolean;
  mailSubject: string;
}) {
  const ref = useRef<ComponentRef<"p">>(null);
  useEffect(() => {
    if (announce) ref.current?.focus();
  }, [announce]);
  return (
    <>
      <p
        ref={ref}
        role={announce ? "alert" : undefined}
        tabIndex={announce ? -1 : undefined}
        className="mb-6 text-base [overflow-wrap:anywhere] focus:outline-none"
        style={{ color: "var(--text-secondary)" }}
      >
        {message}
      </p>
      <a
        href={`mailto:${CONTACT}?subject=${encodeURIComponent(mailSubject)}`}
        className="inline-block px-5 py-3 rounded-xl text-base font-semibold text-white"
        style={{ background: "var(--quote-cta)" }}
      >
        Email {CONTACT}
      </a>
    </>
  );
}

// Text sizes here are rem (text-base, text-sm): on phones body has a px
// font-size, and inherited text would not follow the reader's text size.
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]";

/**
 * target must keep its identity between renders (useMemo it): a new one
 * checks the status again. It renders inside a `.quote-ui` page, which
 * defines the colours it uses.
 */
export default function DocumentAccessGate({
  target,
  onUnlocked,
}: {
  target: AccessTarget;
  onUnlocked: () => void;
}) {
  const copy = ACCESS_COPY[target.kind];
  const sentKey = `${target.kind}:${target.key}`;
  const inputId = `${target.kind}-code`;
  const errorId = `${inputId}-error`;
  const resendHintId = `${inputId}-resend-hint`;
  const [screen, setScreen] = useState<Screen>({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(() => readChallenge(target));
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  // Numbered so the same message twice in a row is announced again.
  const [error, setError] = useState<{ text: string; n: number } | null>(null);
  const [sends, setSends] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [resendMinutes, setResendMinutes] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const showError = useCallback(
    (text: string) => setError((e) => ({ text, n: (e?.n ?? 0) + 1 })),
    [],
  );
  const contact = useCallback(
    (message: string) => {
      saveChallenge(target, null);
      setScreen({ kind: "contact", message, announce: true });
    },
    [target],
  );
  const waitUntil = useCallback((seconds: number) => {
    setResendAt(Date.now() + seconds * 1000);
    setResendMinutes(Math.max(1, Math.round(seconds / 60)));
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let live = true;
    target.status().then(
      (status) => {
        if (!live) return;
        if (!status.locked) onUnlocked();
        else if (status.blocked) setScreen({ kind: "contact", message: BLOCKED, announce: false });
        // A record with no address can't unlock. An unsigned invoice link
        // can, but the server hides the address (maskedEmail null); quotes
        // have no such link.
        else if (!status.maskedEmail && (target.kind === "quote" || !status.canUnlock))
          setScreen({ kind: "contact", message: copy.noEmail, announce: false });
        else {
          setMaskedEmail(status.maskedEmail ?? null);
          setScreen({ kind: "entry" });
        }
      },
      (err: unknown) => {
        if (!live) return;
        const message = err instanceof Error ? err.message : copy.loadError;
        setScreen({ kind: "error", message });
      },
    );
    return () => {
      live = false;
    };
  }, [target, copy, onUnlocked, attempt]);

  const sendCode = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      const sent = await target.send();
      saveChallenge(target, sent.challenge, sent.expiresInSeconds);
      setChallenge(sent.challenge);
      if (sent.maskedEmail) setMaskedEmail(sent.maskedEmail);
      setSends((n) => n + 1);
      waitUntil(sent.retryAfterSeconds);
      setCode("");
    } catch (err) {
      const access = err instanceof QuoteApiError ? err.access : {};
      const message = err instanceof Error ? err.message : "We couldn't send the code.";
      // The kill switch went on after the page loaded: the document opens as it is.
      if (access.gateOff) return onUnlocked();
      if (access.blocked) return contact(BLOCKED);
      if (access.noEmail) return contact(copy.noEmail);
      if (access.retryAfterSeconds) waitUntil(access.retryAfterSeconds);
      showError(message);
    } finally {
      setSending(false);
    }
    inputRef.current?.focus();
  }, [target, copy, onUnlocked, contact, showError, waitUntil]);

  // Ask for a code once the page is actually in front of someone, so a tab
  // opened in the background (or prerendered) doesn't email a code. Not when
  // the address is hidden (an unsigned link, guessable until its grace ends):
  // the visitor presses Send a code, so a guess alone emails nobody.
  useEffect(() => {
    if (screen.kind !== "entry" || !maskedEmail || challenge || autoSent.has(sentKey)) return;
    const go = () => {
      if (document.visibilityState !== "visible" || autoSent.has(sentKey)) return;
      autoSent.add(sentKey);
      void sendCode();
    };
    document.addEventListener("visibilitychange", go);
    go();
    return () => document.removeEventListener("visibilitychange", go);
  }, [screen.kind, maskedEmail, challenge, sentKey, sendCode]);

  // The resend countdown ticks once a second while it runs.
  useEffect(() => {
    if (resendAt <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [resendAt, now]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (verifying) return;
    if (!/^\d{6}$/.test(code)) {
      showError("Enter the 6-digit code from the email.");
      inputRef.current?.focus();
      return;
    }
    if (!challenge) {
      showError("Ask for a code first.");
      inputRef.current?.focus();
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await target.verify(challenge, code);
      saveChallenge(target, null);
      onUnlocked();
      return;
    } catch (err) {
      const access = err instanceof QuoteApiError ? err.access : {};
      const message = err instanceof Error ? err.message : "We couldn't check the code.";
      if (access.blocked) return contact(BLOCKED);
      if (access.newCodeNeeded) {
        saveChallenge(target, null);
        setChallenge(null);
      }
      const left = access.triesLeft;
      showError(left ? `${message} ${left} ${left === 1 ? "try" : "tries"} left.` : message);
    } finally {
      setVerifying(false);
    }
    inputRef.current?.focus();
  };

  if (screen.kind === "checking") return <QuoteLoading label={copy.loading} />;
  if (screen.kind === "error")
    return <QuoteError message={screen.message} onRetry={() => setAttempt((n) => n + 1)} />;

  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const resendWaits = sending || waitSeconds > 0;
  const recipient = maskedEmail ?? copy.recipient;
  return (
    <QuoteCard>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {copy.title}
      </h1>
      {screen.kind === "contact" ? (
        <ContactUs
          message={screen.message}
          announce={screen.announce}
          mailSubject={copy.mailSubject}
        />
      ) : (
        <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
          <p
            className="text-base [overflow-wrap:anywhere]"
            style={{ color: "var(--text-secondary)" }}
          >
            {copy.intro}
          </p>
          <p
            role="status"
            className="text-sm font-medium [overflow-wrap:anywhere]"
            style={{ color: "var(--text-primary)" }}
          >
            {/* Keyed by the send, so a resend to the same address is announced too. */}
            <span key={sends}>
              {challenge
                ? `We sent ${sends > 1 ? "a new" : "a"} code to ${recipient}.`
                : sending
                  ? `Sending a code to ${recipient}…`
                  : ""}
            </span>
          </p>
          <div className="min-w-0">
            <label
              htmlFor={inputId}
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              6-digit code
            </label>
            {/* A slate border (3:1 or more in both themes) and the buttons' focus ring. */}
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(digits(e.target.value))}
              onPaste={(e) => {
                // maxLength would cut "123 456" to "123 45" before onChange sees it.
                e.preventDefault();
                setCode(digits(e.clipboardData.getData("text")));
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={`glass-input w-full min-w-0 sm:w-56 rounded-xl px-3 sm:px-4 py-3 text-lg tracking-normal sm:text-xl sm:tracking-[0.3em] tabular-nums ${FOCUS_RING}`}
              style={{ borderColor: "var(--text-secondary)" }}
            />
          </div>
          {error && (
            <p
              key={error.n}
              id={errorId}
              role="alert"
              className="text-sm [overflow-wrap:anywhere]"
              style={{ color: "var(--status-failed-text)" }}
            >
              {error.text}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {/* aria-disabled, not disabled: disabling the focused button would
                drop keyboard focus to <body> while the request runs. */}
            <button
              type="submit"
              aria-disabled={verifying}
              className={`min-h-12 px-8 rounded-xl text-base font-semibold text-white transition-opacity aria-disabled:opacity-50 aria-disabled:cursor-not-allowed ${FOCUS_RING}`}
              style={{ background: "var(--quote-cta)" }}
            >
              {verifying ? "Checking…" : copy.submit}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!resendWaits) void sendCode();
              }}
              aria-disabled={resendWaits}
              aria-describedby={waitSeconds > 0 ? resendHintId : undefined}
              className={`min-h-12 px-5 rounded-xl border text-base aria-disabled:opacity-60 aria-disabled:cursor-not-allowed ${FOCUS_RING}`}
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {challenge ? "Send a new code" : "Send a code"}
              {/* Visible only: a screen reader would otherwise hear every tick. */}
              {waitSeconds > 0 && <span aria-hidden="true"> in {clock(waitSeconds)}</span>}
            </button>
            {waitSeconds > 0 && (
              <span id={resendHintId} className="sr-only">
                You can ask for a new code in about {resendMinutes}{" "}
                {resendMinutes === 1 ? "minute" : "minutes"}.
              </span>
            )}
          </div>
          <p
            className="text-sm [overflow-wrap:anywhere]"
            style={{ color: "var(--text-secondary)" }}
          >
            No email after a few minutes? Check your spam folder, or write to{" "}
            <a href={`mailto:${CONTACT}`} className="underline">
              {CONTACT}
            </a>
            .
          </p>
        </form>
      )}
    </QuoteCard>
  );
}

/**
 * What a locked document page shows, without the page frame. In the
 * dashboard's Preview the code screen is never shown: it would email the
 * client a code. cookieBlocked: the browser was just signed in but still
 * looks locked, so it dropped the cookie; another code wouldn't help.
 */
export function LockedDocument({
  target,
  onUnlocked,
  onRetry,
  admin = false,
  cookieBlocked = false,
}: {
  target: AccessTarget;
  onUnlocked: () => void;
  onRetry: () => void;
  admin?: boolean;
  cookieBlocked?: boolean;
}) {
  if (admin)
    return (
      <QuoteCard>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Preview needs your dashboard session
        </h1>
        <p className="text-base" style={{ color: "var(--text-secondary)" }}>
          Sign in to the dashboard in this browser, then open Preview again. No code was sent to the
          client.
        </p>
      </QuoteCard>
    );
  if (cookieBlocked)
    return (
      <QuoteError
        title={ACCESS_COPY[target.kind].title}
        message={COOKIE_BLOCKED}
        onRetry={onRetry}
      />
    );
  return <DocumentAccessGate target={target} onUnlocked={onUnlocked} />;
}
