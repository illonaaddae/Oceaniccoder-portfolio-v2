import React, { useState } from "react";
import AnimatedCard from "./AnimatedCard";
import { config } from "@/config/env";

export interface CardPaymentProps {
  invoice: {
    invoiceNumber: string;
    clientEmail: string;
    total: number;
    currency: string;
    clientName: string;
  };
  // Called after Paystack popup callback fires. Server-side webhook
  // (/api/paystack-webhook) owns invoice "paid" status + payments row creation.
  onSuccess: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
};

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as Record<string, unknown>).PaystackPop) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paystack"));
    document.body.appendChild(script);
  });
}

const CardPayment: React.FC<CardPaymentProps> = ({ invoice, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency;

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      await loadPaystackScript();

      const PaystackPop = (window as unknown as Record<string, unknown>).PaystackPop as {
        setup: (config: Record<string, unknown>) => { openIframe: () => void };
      };

      const ref = `OC-${invoice.invoiceNumber}-${Date.now()}`;

      const handler = PaystackPop.setup({
        key: config.payment.paystackPublicKey,
        email: invoice.clientEmail,
        amount: Math.round(invoice.total * 100),
        currency: invoice.currency,
        ref,
        channels: ["card"],
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          custom_fields: [
            {
              display_name: "Invoice",
              variable_name: "invoiceNumber",
              value: invoice.invoiceNumber,
            },
            { display_name: "Client", variable_name: "clientName", value: invoice.clientName },
          ],
        },
        callback: () => {
          setLoading(false);
          onSuccess();
        },
        onClose: () => {
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch {
      setError("Failed to load payment. Please try again.");
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
        type="button"
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
            Opening payment…
          </span>
        ) : (
          `Pay ${sym}${invoice.total.toFixed(2)} ${invoice.currency} with Card`
        )}
      </button>
    </div>
  );
};

export default CardPayment;
