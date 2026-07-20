import React, { useState } from "react";
import { PAYMENT_CONFIG } from "../../config/payment";

export interface MomoPaymentProps {
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

type MomoNetwork = "mtn" | "vodafone" | "airteltigo";

interface NetworkOption {
  id: MomoNetwork;
  label: string;
  shortLabel: string;
  bg: string;
  textColor: string;
  border: string;
  glow: string;
}

const NETWORKS: NetworkOption[] = [
  {
    id: "mtn",
    label: "MTN MoMo",
    shortLabel: "MTN",
    bg: "#ffcc00",
    textColor: "#000000",
    border: "#ffcc00",
    glow: "rgba(255,204,0,0.4)",
  },
  {
    id: "vodafone",
    label: "Telecel Cash",
    shortLabel: "VODA",
    bg: "#e60000",
    textColor: "#ffffff",
    border: "#e60000",
    glow: "rgba(230,0,0,0.4)",
  },
  {
    id: "airteltigo",
    label: "AirtelTigo Money",
    shortLabel: "AT",
    bg: "linear-gradient(135deg, #e60000 0%, #001f6b 100%)",
    textColor: "#ffffff",
    border: "#5b7fd4",
    glow: "rgba(91,127,212,0.4)",
  },
];

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

const MomoPayment: React.FC<MomoPaymentProps> = ({ invoice, onSuccess }) => {
  const [selected, setSelected] = useState<MomoNetwork | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency;

  const handlePay = async () => {
    if (!selected) {
      setError("Please select a mobile money network.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await loadPaystackScript();

      const PaystackPop = (window as unknown as Record<string, unknown>).PaystackPop as {
        setup: (config: Record<string, unknown>) => { openIframe: () => void };
      };

      const ref = `OC-${invoice.invoiceNumber}-${Date.now()}`;

      const handler = PaystackPop.setup({
        key: PAYMENT_CONFIG.paystackPublicKey,
        email: invoice.clientEmail,
        amount: Math.round(invoice.total * 100),
        currency: invoice.currency,
        ref,
        channels: ["mobile_money"],
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          custom_fields: [
            {
              display_name: "Invoice",
              variable_name: "invoiceNumber",
              value: invoice.invoiceNumber,
            },
            { display_name: "Client", variable_name: "clientName", value: invoice.clientName },
            { display_name: "Network", variable_name: "momoNetwork", value: selected },
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
    <div className="flex flex-col gap-6">
      <h3 className="text-center text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        Pay with Mobile Money
      </h3>

      <div className="flex flex-col gap-3">
        {NETWORKS.map((net) => {
          const isSelected = selected === net.id;
          return (
            <button
              key={net.id}
              type="button"
              onClick={() => setSelected(net.id)}
              className="flex items-center gap-4 w-full rounded-xl px-4 py-3 transition-all"
              style={{
                border: isSelected ? `2px solid ${net.border}` : "2px solid var(--border-subtle)",
                background: isSelected
                  ? `rgba(${net.id === "mtn" ? "255,204,0" : net.id === "vodafone" ? "230,0,0" : "91,127,212"},0.08)`
                  : "var(--bg-secondary)",
                boxShadow: isSelected ? `0 0 12px ${net.glow}` : "none",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: net.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontWeight: "800",
                  fontSize: net.shortLabel.length > 3 ? "10px" : "12px",
                  color: net.textColor,
                  letterSpacing: "0.5px",
                }}
              >
                {net.shortLabel}
              </div>
              <span className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                {net.label}
              </span>
              <div
                className="ml-auto"
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: isSelected ? "none" : "2px solid var(--border-subtle)",
                  background: isSelected ? "var(--accent-teal)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm text-center"
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
        disabled={loading || !selected}
        className="w-full rounded-xl py-4 font-bold text-base text-white transition-opacity"
        style={{
          background:
            !selected || loading
              ? "rgba(12,133,153,0.4)"
              : "linear-gradient(135deg, #0C8599 0%, #085866 100%)",
          cursor: !selected || loading ? "not-allowed" : "pointer",
          opacity: !selected || loading ? 0.7 : 1,
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
          `Pay ${sym}${invoice.total.toFixed(2)} ${invoice.currency}`
        )}
      </button>
    </div>
  );
};

export default MomoPayment;
