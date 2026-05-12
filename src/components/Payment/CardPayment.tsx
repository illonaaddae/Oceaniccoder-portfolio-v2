import React, { useState } from "react";
import AnimatedCard from "./AnimatedCard";
import { apiUrl } from "@/utils/apiUrl";

export interface CardPaymentProps {
  invoice: {
    invoiceNumber: string;
    clientEmail: string;
    total: number;
    currency: string;
    clientName: string;
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
};

const CardPayment: React.FC<CardPaymentProps> = ({ invoice }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency;

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiUrl("/api/paystack-init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          email: invoice.clientEmail,
          amount: invoice.total,
          currency: invoice.currency,
        }),
      });

      const data = (await res.json()) as { authorizationUrl?: string; error?: string };

      if (!res.ok || !data.authorizationUrl) {
        setError(data.error ?? "Failed to initialize payment. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect to Paystack-hosted checkout
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <AnimatedCard />

      <div className="flex flex-col items-center gap-1">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Secure payment powered by
        </p>
        {/* Paystack brand text */}
        <span
          style={{
            fontWeight: "700",
            fontSize: "18px",
            color: "#00c3f7",
            letterSpacing: "-0.02em",
          }}
        >
          Paystack
        </span>
      </div>

      {error && (
        <div
          className="w-full rounded-lg px-4 py-3 text-sm text-center"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full rounded-xl py-4 font-bold text-base text-white transition-opacity"
        style={{
          background: loading
            ? "rgba(13,148,136,0.5)"
            : "linear-gradient(135deg, #0d9488 0%, #065f57 100%)",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Redirecting to Paystack…
          </span>
        ) : (
          `Pay ${sym}${invoice.total.toFixed(2)} ${invoice.currency} with Card`
        )}
      </button>
    </div>
  );
};

export default CardPayment;
