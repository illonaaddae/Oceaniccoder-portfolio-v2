import React, { useState } from "react";
import { PAYMENT_CONFIG } from "../../config/payment";
import MomoNetworkPicker, { type MomoNetwork } from "./MomoNetworkPicker";
import { loadPaystackV1 } from "@/utils/paystackV1";

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

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
};

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
      const PaystackPop = await loadPaystackV1();

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

      <MomoNetworkPicker value={selected} onChange={setSelected} />

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
