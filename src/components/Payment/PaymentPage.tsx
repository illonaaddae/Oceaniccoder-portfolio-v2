import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { apiUrl } from "@/utils/apiUrl";
import CardPayment from "./CardPayment";
import MomoPayment from "./MomoPayment";
import BankTransfer from "./BankTransfer";

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
}

type PaymentTab = "card" | "momo" | "bank";

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
          background: "linear-gradient(135deg, #0d9488 0%, #065f57 100%)",
        }}
      >
        <img
          src="/images/logo/Oceaniccoder-croped.png"
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
                  style={{ color: "#fbbf24" }}
                >
                  Payment Due
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "#fde68a" }}>
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
                  background: "rgba(13,148,136,0.1)",
                  border: "1px solid rgba(13,148,136,0.3)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#2dd4bf" }}
                >
                  Est. Delivery
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "#99f6e4" }}>
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

  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [slowWarning, setSlowWarning] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentTab>("card");
  const [paid, setPaid] = useState(false);

  const isSuccess = isSuccessParam || paid;

  // Payment record creation + invoice "paid" status update are owned by
  // `/api/paystack-webhook` (server-side, atomic). Client only flips UI to
  // success view here — webhook fires async from Paystack and writes both
  // invoice.status="paid" and a payments collection row.
  const handlePaymentSuccess = useCallback(() => {
    setPaid(true);
  }, []);

  const doFetch = useCallback(async () => {
    if (!invoiceNumber) return;
    setLoading(true);
    setFetchError(null);
    setSlowWarning(false);

    const controller = new AbortController();
    const slowTimer = window.setTimeout(() => setSlowWarning(true), 4000);
    const killTimer = window.setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(
        apiUrl(`/api/get-invoice?number=${encodeURIComponent(invoiceNumber)}`),
        { signal: controller.signal },
      );
      const data = (await res.json()) as PublicInvoice & { error?: string };

      if (!res.ok) {
        setFetchError(data.error ?? "Invoice not found.");
        return;
      }

      setInvoice(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setFetchError("timeout");
      } else {
        setFetchError("Could not load invoice. Please check the link and try again.");
      }
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(killTimer);
      setLoading(false);
      setSlowWarning(false);
    }
  }, [invoiceNumber]);

  useEffect(() => {
    void doFetch();
  }, [doFetch]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start px-4 pt-24 pb-12"
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
                Server is waking up — this takes a few seconds on first load...
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
                  again — it should load immediately now.
                </p>
                <button
                  type="button"
                  onClick={() => void doFetch()}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                  }}
                >
                  Try Again
                </button>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">🧾</div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  Invoice Not Found
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {fetchError}
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
                {invoice.status !== "paid" && (
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
