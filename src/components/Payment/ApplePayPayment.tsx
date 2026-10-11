import React, { useCallback, useEffect, useRef, useState } from "react";
import { PAYMENT_CONFIG } from "../../config/payment";
import { loadPaystackV2 } from "@/utils/paystackV2";

export interface ApplePayPaymentProps {
  invoice: {
    invoiceNumber: string;
    clientEmail: string;
    total: number;
    currency: string;
    clientName: string;
  };
  // Called after Paystack reports a successful charge. The server-side webhook
  // (/api/paystack-webhook) still owns invoice "paid" status + payments row
  // creation — same contract as CardPayment.
  onSuccess: () => void;
  // Reports whether Apple Pay actually mounted. Apple Pay only exists on Safari
  // and iOS, and Paystack additionally rejects unsupported currencies and
  // unverified domains, so the parent hides the tab entirely unless this is
  // true. Availability is driven by Paystack's own response, never guessed.
  onAvailability: (available: boolean) => void;
}

const CONTAINER_ID = "paystack-apple-pay";

const ApplePayPayment: React.FC<ApplePayPaymentProps> = ({
  invoice,
  onSuccess,
  onAvailability,
}) => {
  const [error, setError] = useState<string | null>(null);

  // One reference per mount. Regenerating it on re-render would orphan the
  // transaction Paystack already knows about.
  const referenceRef = useRef<string>(`OC-${invoice.invoiceNumber}-${Date.now()}`);
  // paymentRequest mounts DOM into the container, so it must run exactly once.
  const startedRef = useRef(false);

  const handleSuccess = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    // Apple Pay on the web is only possible where the ApplePaySession API
    // exists — Safari and iOS. Bailing here means the majority of visitors
    // never download Inline v2 at all, and never exercise the PaystackPop
    // global swap that the card and momo flows have to be protected from.
    // This is a capability check, not user-agent sniffing; Paystack's
    // onElementsMount still has the final say for devices that pass it.
    if (!("ApplePaySession" in window)) {
      onAvailability(false);
      return;
    }

    const mount = async () => {
      try {
        const popup = await loadPaystackV2();
        if (cancelled) return;

        await popup.paymentRequest({
          key: PAYMENT_CONFIG.paystackPublicKey,
          email: invoice.clientEmail,
          amount: Math.round(invoice.total * 100),
          currency: invoice.currency,
          ref: referenceRef.current,
          container: CONTAINER_ID,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            custom_fields: [
              {
                display_name: "Invoice",
                variable_name: "invoiceNumber",
                value: invoice.invoiceNumber,
              },
              {
                display_name: "Client",
                variable_name: "clientName",
                value: invoice.clientName,
              },
            ],
          },
          styles: {
            theme: "dark",
            applePay: {
              width: "100%",
              height: "52px",
              borderRadius: "12px",
              type: "pay",
              locale: "en",
            },
          },
          // Returns { applePay: true } when the button mounted, null when the
          // device or browser has no Apple Pay support.
          onElementsMount: (elements: { applePay?: boolean } | null) => {
            if (cancelled) return;
            onAvailability(Boolean(elements && elements.applePay));
          },
          onSuccess: handleSuccess,
          onCancel: () => {
            /* customer dismissed the sheet — nothing to do */
          },
          onError: () => {
            if (!cancelled) setError("Apple Pay could not complete. Please try another method.");
          },
        });
      } catch {
        // Thrown when Paystack refuses the request outright — unregistered
        // domain, unsupported currency, channel not enabled on the account.
        // Treat as "not available" and stay silent; the tab never renders, so
        // there is nothing for the customer to see an error about.
        if (!cancelled) onAvailability(false);
      }
    };

    void mount();

    return () => {
      cancelled = true;
    };
  }, [invoice, handleSuccess, onAvailability]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div id={CONTAINER_ID} className="w-full" />

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
    </div>
  );
};

export default ApplePayPayment;
