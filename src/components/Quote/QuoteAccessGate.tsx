import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading } from "./QuoteShell";
import {
  fetchQuoteAccess,
  QuoteApiError,
  sendQuoteCode,
  verifyQuoteCode,
} from "@/services/api/quotes";

// The code screen for a quote link opened in a browser with no unlock
// (docs/plans/2026-10-20-quote-access-code.md). It asks for a code by itself
// once the page is visible, so the client only has to type it in. It shows
// no client name or amounts.

const CONTACT = "hello@oceaniccoder.dev";
const BLOCKED = `Too many wrong codes were entered on this link, so no more codes will be sent. Contact ${CONTACT} for a new link.`;
const NO_EMAIL = `This quote can't be opened with a code. Contact ${CONTACT} to open it.`;
const ERROR_ID = "quote-code-error";

// One automatic code email per link per page load, however often the screen
// mounts (StrictMode, moving between the quote and pay pages). Resend is the
// client's own choice after that.
const autoSent = new Set<string>();
// Links whose status already said "unlocked" once this page load. If the quote
// then still answers locked, reloading again would loop, so show an error.
const unlockedByStatus = new Set<string>();

// The challenge for the code that was emailed, kept per link for this tab so
// a refresh doesn't lose it. sessionStorage can throw (Safari private mode,
// storage blocked); then a refresh just asks for a new code.
const storageKey = (token: string) => `oc-quote-code:${token}`;

function readChallenge(token: string): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(token)) || "null");
    if (saved && typeof saved.challenge === "string" && saved.expiresAt > Date.now())
      return saved.challenge;
  } catch {
    return null;
  }
  return null;
}

function saveChallenge(token: string, challenge: string | null, expiresInSeconds = 0) {
  try {
    if (challenge)
      sessionStorage.setItem(
        storageKey(token),
        JSON.stringify({ challenge, expiresAt: Date.now() + expiresInSeconds * 1000 }),
      );
    else sessionStorage.removeItem(storageKey(token));
  } catch {
    // See readChallenge: without storage the code still works in this page.
  }
}

const clean = (text: string) => text.replace(/[\s-]/g, "").slice(0, 6);
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

type Screen =
  | { kind: "checking" }
  | { kind: "entry" }
  | { kind: "contact"; message: string }
  | { kind: "error"; message: string };

function ContactUs({ message }: { message: string }) {
  return (
    <>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>
      <a
        href={`mailto:${CONTACT}?subject=${encodeURIComponent("Quote link")}`}
        className="inline-block px-5 py-3 rounded-xl font-semibold text-white"
        style={{ background: "var(--quote-cta)" }}
      >
        Email {CONTACT}
      </a>
    </>
  );
}

export default function QuoteAccessGate({
  token,
  onUnlocked,
}: {
  token: string;
  onUnlocked: () => void;
}) {
  const [screen, setScreen] = useState<Screen>({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(() => readChallenge(token));
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    fetchQuoteAccess(token).then(
      (status) => {
        if (!live) return;
        if (!status.locked && !unlockedByStatus.has(token)) {
          unlockedByStatus.add(token);
          onUnlocked();
        } else if (!status.locked)
          setScreen({ kind: "error", message: "We couldn't open the quote. Please try again." });
        else if (status.blocked) setScreen({ kind: "contact", message: BLOCKED });
        else if (!status.maskedEmail) setScreen({ kind: "contact", message: NO_EMAIL });
        else {
          setMaskedEmail(status.maskedEmail);
          setScreen({ kind: "entry" });
        }
      },
      (err: unknown) => {
        if (!live) return;
        const message =
          err instanceof Error ? err.message : "We couldn't open the quote. Please try again.";
        setScreen({ kind: "error", message });
      },
    );
    return () => {
      live = false;
    };
  }, [token, onUnlocked, attempt]);

  const sendCode = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      const sent = await sendQuoteCode(token);
      saveChallenge(token, sent.challenge, sent.expiresInSeconds);
      setChallenge(sent.challenge);
      if (sent.maskedEmail) setMaskedEmail(sent.maskedEmail);
      setResendAt(Date.now() + sent.retryAfterSeconds * 1000);
      setNow(Date.now());
      setCode("");
      inputRef.current?.focus();
    } catch (err) {
      const access = err instanceof QuoteApiError ? err.access : {};
      const message = err instanceof Error ? err.message : "We couldn't send the code.";
      if (access.blocked) setScreen({ kind: "contact", message: BLOCKED });
      else if (access.noEmail) setScreen({ kind: "contact", message: NO_EMAIL });
      else {
        if (access.retryAfterSeconds) {
          setResendAt(Date.now() + access.retryAfterSeconds * 1000);
          setNow(Date.now());
        }
        setError(message);
      }
    } finally {
      setSending(false);
    }
  }, [token]);

  // Ask for a code once the page is actually in front of someone, so a tab
  // opened in the background (or prerendered) doesn't email a code.
  useEffect(() => {
    if (screen.kind !== "entry" || challenge || autoSent.has(token)) return;
    const go = () => {
      if (document.visibilityState !== "visible" || autoSent.has(token)) return;
      autoSent.add(token);
      void sendCode();
    };
    document.addEventListener("visibilitychange", go);
    go();
    return () => document.removeEventListener("visibilitychange", go);
  }, [screen.kind, challenge, token, sendCode]);

  // The resend countdown ticks once a second while it runs.
  useEffect(() => {
    if (resendAt <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [resendAt, now]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email.");
      inputRef.current?.focus();
      return;
    }
    if (!challenge) {
      setError("That code has expired. Ask for a new one.");
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await verifyQuoteCode(token, challenge, code);
      saveChallenge(token, null);
      onUnlocked();
    } catch (err) {
      const access = err instanceof QuoteApiError ? err.access : {};
      const message = err instanceof Error ? err.message : "We couldn't check the code.";
      if (access.blocked) {
        saveChallenge(token, null);
        setScreen({ kind: "contact", message: BLOCKED });
        return;
      }
      if (access.newCodeNeeded) {
        saveChallenge(token, null);
        setChallenge(null);
      }
      const left = access.triesLeft;
      setError(left ? `${message} ${left} ${left === 1 ? "try" : "tries"} left.` : message);
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  if (screen.kind === "checking") return <QuoteLoading />;
  if (screen.kind === "error")
    return <QuoteError message={screen.message} onRetry={() => setAttempt((n) => n + 1)} />;

  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  return (
    <QuoteCard>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Open your quote
      </h1>
      {screen.kind === "contact" ? (
        <ContactUs message={screen.message} />
      ) : (
        <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
          <p style={{ color: "var(--text-secondary)" }}>
            To keep your quote private, it opens with a code we email to you.
          </p>
          <p role="status" className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {challenge
              ? `We sent a code to ${maskedEmail}.`
              : sending
                ? `Sending a code to ${maskedEmail}…`
                : ""}
          </p>
          <div>
            <label
              htmlFor="quote-code"
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              6-digit code
            </label>
            <input
              ref={inputRef}
              id="quote-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(clean(e.target.value))}
              onPaste={(e) => {
                // maxLength would cut "123 456" to "123 45" before onChange sees it.
                e.preventDefault();
                setCode(clean(e.clipboardData.getData("text")));
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ERROR_ID : undefined}
              className="glass-input w-full sm:w-56 rounded-xl px-4 py-3 text-xl tracking-[0.3em] tabular-nums"
            />
          </div>
          {error && (
            <p
              id={ERROR_ID}
              role="alert"
              className="text-sm"
              style={{ color: "var(--status-failed-text)" }}
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={verifying}
              className="min-h-12 px-8 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]"
              style={{ background: "var(--quote-cta)" }}
            >
              {verifying ? "Checking…" : "Open quote"}
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={sending || waitSeconds > 0}
              className="min-h-12 px-5 rounded-xl border disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {challenge ? "Send a new code" : "Send a code"}
              {/* Visible only: a screen reader would otherwise hear every tick. */}
              {waitSeconds > 0 && <span aria-hidden="true"> in {clock(waitSeconds)}</span>}
            </button>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
 * The whole page for a locked quote. In the dashboard's Preview the code
 * screen is never shown: it would email the client a code.
 */
export function LockedQuote({
  token,
  onUnlocked,
  admin = false,
}: {
  token: string;
  onUnlocked: () => void;
  admin?: boolean;
}) {
  return (
    <QuoteShell title="Open your quote" width="narrow">
      {admin ? (
        <QuoteCard>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Preview needs your dashboard session
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Sign in to the dashboard in this browser, then open Preview again. No code was sent to
            the client.
          </p>
        </QuoteCard>
      ) : (
        <QuoteAccessGate token={token} onUnlocked={onUnlocked} />
      )}
    </QuoteShell>
  );
}
