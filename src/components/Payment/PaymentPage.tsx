import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { apiUrl } from "@/utils/apiUrl";
import { takeLinkCode } from "@/utils/linkCode";
import { docAccessTarget } from "@/services/api/access";
import { LockedDocument } from "@/components/Access/DocumentAccessGate";
import QuoteShell from "@/components/Quote/QuoteShell";
import CardPayment from "./CardPayment";
import MomoPayment from "./MomoPayment";
import BankTransfer from "./BankTransfer";
import ApplePayPayment from "./ApplePayPayment";
import { PAYMENT_CONFIG } from "@/config/payment";
import { LOGO_PATHS } from "@/components/Navbar/navData";

// Safe public invoice fields returned by /api/get-invoice
interface PublicInvoice {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  total: number;
  currency: string;
  status: string;
  dueDate: string | null;
  estimatedDelivery: string | null;
  /** Set when get-invoice let the admin session in instead of an unlock. */
  preview?: boolean;
}

type PaymentTab = "card" | "momo" | "bank" | "applepay";

type FetchError = "timeout" | "busy" | { title: string; message: string };

// An unsigned link (grace period) sends no s, so doc-access hides the address.
const invoiceLocator = (number: string, signature: string | null) =>
  signature
    ? { kind: "invoice" as const, number, s: signature }
    : { kind: "invoice" as const, number };

// A link code works once, so a page load claims it once, even when the page
// mounts twice (StrictMode) or loads the invoice again. A refused claim (used
// already, an older email, another browser got there first) or a network
// failure is not an error here: the lookup answers 401 and the code screen
// asks for an emailed code instead. Resolves true when the claim signed the
// browser in. Same rules as useClientQuote's for quotes.
const claims = new Map<string, Promise<boolean>>();

// Resolves once the page is in front of someone. A mail scanner that opens
// the link (and even runs its script) without showing it never gets here, so
// it can't spend the link code. Same rule as the code screen's auto-send.
function whenVisible(): Promise<void> {
  return new Promise((resolve) => {
    const go = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", go);
      resolve();
    };
    document.addEventListener("visibilitychange", go);
    go();
  });
}

function claimLinkOnce(number: string, signature: string | null): Promise<boolean> {
  const code = takeLinkCode("invoice", number);
  if (code) {
    const target = docAccessTarget(invoiceLocator(number, signature));
    const claim = whenVisible()
      .then(() => target.claim(code))
      .then(
        () => true,
        () => false,
      );
    claims.set(number, claim);
    void claim.then(() => claims.delete(number));
  }
  return claims.get(number) ?? Promise.resolve(false);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
};

// ---- Success state ----
const SuccessView: React.FC<{ invoice: PublicInvoice }> = ({ invoice }) => {
  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency;
  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      {/* Checkmark */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: "72px",
          height: "72px",
          background: "rgba(34,197,94,0.15)",
          border: "2px solid rgba(34,197,94,0.5)",
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 18l8 8 14-14"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Payment Received!
        </h1>
        <p className="text-base" style={{ color: "var(--text-secondary)" }}>
          Thank you, <strong style={{ color: "var(--text-primary)" }}>{invoice.clientName}</strong>.
          Your payment for{" "}
          <strong style={{ color: "var(--accent-teal)" }}>{invoice.invoiceNumber}</strong> of{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {sym}
            {invoice.total.toFixed(2)} {invoice.currency}
          </strong>{" "}
          has been received.
        </p>
      </div>

      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        You&apos;ll receive a confirmation email shortly.
      </p>

      <a
        href="https://oceaniccoder.dev"
        className="mt-2 text-sm font-medium underline"
        style={{ color: "var(--accent-teal)" }}
      >
        Return to OceanicCoder
      </a>
    </div>
  );
};

// ---- Tab button ----
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all"
    style={{
      background: active ? "var(--accent-teal)" : "transparent",
      color: active ? "#ffffff" : "var(--text-secondary)",
      border: active ? "none" : "1px solid var(--border-subtle)",
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);

// ---- Invoice summary card ----
const InvoiceSummary: React.FC<{ invoice: PublicInvoice }> = ({ invoice }) => {
  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency;

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{ border: "1px solid var(--border-subtle)" }}
    >
      {/* Header bar */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #0C8599 0%, #085866 100%)",
        }}
      >
        <img
          src={LOGO_PATHS.light}
          alt="OceanicCoder"
          width="110"
          height="32"
          style={{ display: "block" }}
        />
        <div className="text-right">
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Invoice
          </p>
          <p className="text-base font-bold text-white">{invoice.invoiceNumber}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4" style={{ background: "var(--bg-secondary)" }}>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Billed to
        </p>
        <p
          className="text-base font-semibold"
          style={{
            color: "var(--text-primary)",
            marginBottom: invoice.estimatedDelivery || invoice.dueDate ? "12px" : "16px",
          }}
        >
          {invoice.clientName}
        </p>

        {/* Due / Delivery dates */}
        {(invoice.dueDate || invoice.estimatedDelivery) && (
          <div className="flex gap-3 flex-wrap mb-4">
            {invoice.dueDate && (
              <div
                className="flex-1 rounded-lg px-3 py-2"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--accent-amber-strong)" }}
                >
                  Payment Due
                </p>
                <p
                  className="text-sm font-semibold mt-0.5"
                  style={{ color: "var(--accent-amber)" }}
                >
                  {new Date(invoice.dueDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
            {invoice.estimatedDelivery && (
              <div
                className="flex-1 rounded-lg px-3 py-2"
                style={{
                  background: "rgba(12,133,153,0.1)",
                  border: "1px solid rgba(12,133,153,0.3)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--accent-teal)" }}
                >
                  Est. Delivery
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--accent-teal)" }}>
                  {new Date(invoice.estimatedDelivery).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <span
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Amount Due
          </span>
          <span className="text-xl font-extrabold" style={{ color: "var(--accent-teal)" }}>
            {sym}
            {invoice.total.toFixed(2)}{" "}
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {invoice.currency}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

// ---- Main page ----
const PaymentPage: React.FC = () => {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const [searchParams] = useSearchParams();
  const isSuccessParam = searchParams.get("payment") === "success";
  // The pay link's signature; get-invoice answers 404 without a valid one.
  const signature = searchParams.get("s");
  // The dashboard's preview link: the server checks the admin session instead
  // of an unlock, and the page takes no payment.
  const admin = searchParams.get("preview") === "admin";

  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [slowWarning, setSlowWarning] = useState(false);
  const [fetchError, setFetchError] = useState<FetchError | null>(null);
  // No unlock for this invoice in this browser. cookieBlocked: it was just
  // signed in and is still locked, so the browser dropped the cookie.
  const [locked, setLocked] = useState<{ cookieBlocked: boolean } | null>(null);
  // Set when the code screen has just signed this browser in.
  const justUnlocked = useRef(false);
  const target = useMemo(
    () => docAccessTarget(invoiceLocator(invoiceNumber ?? "", signature)),
    [invoiceNumber, signature],
  );
  const [activeTab, setActiveTab] = useState<PaymentTab>("card");
  // Stays false until Paystack confirms the Apple Pay button actually mounted,
  // so the tab never appears on Chrome/Android or before the channel is live.
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [paid, setPaid] = useState(false);

  const isSuccess = isSuccessParam || paid;
  // The banner shows and nothing can be paid when either side says preview.
  const preview = admin || invoice?.preview === true;

  // Payment record creation + invoice "paid" status update are owned by
  // `/api/paystack-webhook` (server-side, atomic). Client only flips UI to
  // success view here — webhook fires async from Paystack and writes both
  // invoice.status="paid" and a payments collection row.
  const handlePaymentSuccess = useCallback(() => {
    setPaid(true);
  }, []);

  const handleApplePayAvailability = useCallback((available: boolean) => {
    setApplePayAvailable(available);
  }, []);

  const doFetch = useCallback(async () => {
    if (!invoiceNumber) return;
    setLoading(true);
    setFetchError(null);
    setLocked(null);
    setInvoice(null);
    setSlowWarning(false);
    let signedIn = justUnlocked.current;
    justUnlocked.current = false;
    // The preview never claims the client's link code. The claim waits for the
    // page to be visible, so the timers below start after it.
    if (!admin && (await claimLinkOnce(invoiceNumber, signature))) signedIn = true;

    const controller = new AbortController();
    const slowTimer = window.setTimeout(() => setSlowWarning(true), 4000);
    const killTimer = window.setTimeout(() => controller.abort(), 15000);

    const query = new URLSearchParams({ number: invoiceNumber });
    if (signature) query.set("s", signature);
    if (admin) query.set("admin", "1");

    try {
      const res = await fetch(apiUrl(`/api/get-invoice?${query.toString()}`), {
        signal: controller.signal,
      });
      const data = (await res.json()) as PublicInvoice & { error?: string; locked?: boolean };

      if (res.status === 429) {
        setFetchError("busy");
        return;
      }
      if (res.status === 401 && data.locked) {
        setLocked({ cookieBlocked: signedIn });
        return;
      }
      if (!res.ok) {
        setFetchError({
          title: res.status === 404 ? "Invoice Not Found" : "Something went wrong",
          message: data.error ?? "Invoice not found.",
        });
        return;
      }

      setInvoice(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setFetchError("timeout");
      } else {
        setFetchError({
          title: "Something went wrong",
          message: "Could not load invoice. Please check the link and try again.",
        });
      }
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(killTimer);
      setLoading(false);
      setSlowWarning(false);
    }
  }, [invoiceNumber, signature, admin]);

  useEffect(() => {
    void doFetch();
  }, [doFetch]);

  /** The code screen signed the browser in: load the invoice. */
  const unlocked = useCallback(() => {
    justUnlocked.current = true;
    void doFetch();
  }, [doFetch]);

  // Nothing about the invoice before an unlock, not even its number. The
  // code screen's colours live under QuoteShell's .quote-ui. Opening another
  // invoice reloads, which unmounts this; the key keeps the screen fresh if
  // the link ever changes without a reload.
  if (locked)
    return (
      <QuoteShell title="Open your invoice" width="narrow">
        <LockedDocument
          key={`${invoiceNumber}:${signature ?? ""}`}
          target={target}
          onUnlocked={unlocked}
          onRetry={() => void doFetch()}
          admin={admin}
          cookieBlocked={locked.cookieBlocked}
        />
      </QuoteShell>
    );

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-start px-4 pt-24 pb-12"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-lg">
        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-24 rounded-2xl" style={{ background: "var(--bg-secondary)" }} />
              <div className="h-12 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
              <div className="h-64 rounded-2xl" style={{ background: "var(--bg-secondary)" }} />
            </div>
            {slowWarning && (
              <p className="text-center text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                Server is waking up. This takes a few seconds on first load...
              </p>
            )}
          </div>
        )}

        {/* Error state */}
        {!loading && fetchError && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {fetchError === "timeout" ? (
              <>
                <div className="text-4xl mb-4">⏱</div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  Server is starting up
                </h2>
                <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                  The payment server was asleep and is taking longer than usual to wake up. Try
                  again. It should load immediately now.
                </p>
                <button
                  type="button"
                  onClick={() => void doFetch()}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-teal) 0%, #0a6e7d 100%)",
                  }}
                >
                  Try Again
                </button>
              </>
            ) : fetchError === "busy" ? (
              <>
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  Too many requests
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  This page was loaded too many times in a short while. Wait a few minutes, then
                  reload it.
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">🧾</div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  {fetchError.title}
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {fetchError.message}
                </p>
              </>
            )}
          </div>
        )}

        {/* Invoice loaded */}
        {!loading && invoice && (
          <>
            {isSuccess ? (
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <SuccessView invoice={invoice} />
              </div>
            ) : (
              <>
                {preview && (
                  <section
                    aria-labelledby="pay-preview-title"
                    className="rounded-xl px-4 py-3 mb-4 text-sm"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <h2 id="pay-preview-title" className="font-bold">
                      Preview
                    </h2>
                    <p style={{ color: "var(--text-secondary)" }}>
                      This is the pay page your client sees. The payment options are hidden in the
                      preview.
                    </p>
                  </section>
                )}
                <InvoiceSummary invoice={invoice} />

                {/* Already paid badge */}
                {invoice.status === "paid" && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-center mb-4"
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.4)",
                      color: "#22c55e",
                    }}
                  >
                    This invoice has already been paid. Thank you!
                  </div>
                )}

                {/* Payment tabs */}
                {invoice.status !== "paid" && !preview && (
                  <div
                    className="rounded-2xl p-6"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {/* Tab header */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-6">
                      <TabButton active={activeTab === "card"} onClick={() => setActiveTab("card")}>
                        Pay by Card
                      </TabButton>
                      <TabButton active={activeTab === "momo"} onClick={() => setActiveTab("momo")}>
                        Mobile Money
                      </TabButton>
                      <TabButton active={activeTab === "bank"} onClick={() => setActiveTab("bank")}>
                        Bank Transfer
                      </TabButton>
                      {PAYMENT_CONFIG.applePayEnabled && applePayAvailable && (
                        <TabButton
                          active={activeTab === "applepay"}
                          onClick={() => setActiveTab("applepay")}
                        >
                          Apple Pay
                        </TabButton>
                      )}
                    </div>

                    {/* Tab content */}
                    {activeTab === "card" && (
                      <CardPayment
                        invoice={{
                          invoiceNumber: invoice.invoiceNumber,
                          clientEmail: invoice.clientEmail,
                          total: invoice.total,
                          currency: invoice.currency,
                          clientName: invoice.clientName,
                        }}
                        onSuccess={handlePaymentSuccess}
                      />
                    )}
                    {activeTab === "momo" && (
                      <MomoPayment
                        invoice={{
                          invoiceNumber: invoice.invoiceNumber,
                          clientEmail: invoice.clientEmail,
                          total: invoice.total,
                          currency: invoice.currency,
                          clientName: invoice.clientName,
                        }}
                        onSuccess={handlePaymentSuccess}
                      />
                    )}
                    {activeTab === "bank" && <BankTransfer invoiceNumber={invoice.invoiceNumber} />}

                    {/* Not mounted at all while Apple Pay is disabled, so the
                        Paystack script it pulls in is never fetched either.

                        When enabled it is always mounted and merely hidden:
                        Paystack's paymentRequest() has to run for us to learn
                        whether Apple Pay is available, and it injects its button
                        into the container as a side effect — so it cannot be
                        gated on the tab being active without a chicken-and-egg
                        problem. */}
                    {PAYMENT_CONFIG.applePayEnabled && (
                      <div className={activeTab === "applepay" ? "" : "hidden"} aria-live="polite">
                        <ApplePayPayment
                          invoice={{
                            invoiceNumber: invoice.invoiceNumber,
                            clientEmail: invoice.clientEmail,
                            total: invoice.total,
                            currency: invoice.currency,
                            clientName: invoice.clientName,
                          }}
                          onSuccess={handlePaymentSuccess}
                          onAvailability={handleApplePayAvailability}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: "var(--text-secondary)" }}>
          Payments are processed securely by{" "}
          <span style={{ color: "#00c3f7", fontWeight: "700" }}>Paystack</span>. OceanicCoder does
          not store your card details.
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;
