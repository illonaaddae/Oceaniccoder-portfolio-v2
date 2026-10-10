import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import QuoteShell, { QuoteCard } from "./QuoteShell";
import { checkStagePayment } from "@/services/api/quotes";
import type { PaymentCheckState } from "@/types/quote";

const POLL_MS = 5000;
const GIVE_UP_MS = 5 * 60 * 1000;

export default function PaidPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const reference = params.get("reference") || "";
  const [state, setState] = useState<PaymentCheckState | "slow" | "checking">("checking");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const result = await checkStagePayment(token, reference).catch(() => null);
      if (stop) return;
      if (result && result.state !== "pending") {
        setState(result.state);
        setReceiptPath(result.receiptPath);
        return;
      }
      if (Date.now() - startedAt > GIVE_UP_MS) {
        setState("slow");
        return;
      }
      setState("pending");
      timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [token, reference]);

  const back = (
    <Link
      to={`/q/${token}`}
      className="inline-block mt-6 px-5 py-3 rounded-xl border"
      style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
    >
      Back to your quote
    </Link>
  );

  return (
    <QuoteShell title="Payment" width="narrow">
      <QuoteCard className="text-center">
        {state === "paid" && (
          <>
            <h1
              className="font-heading text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Payment received. Thank you!
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              We've emailed your receipt. You'll hear from us shortly about next steps.
            </p>
            {receiptPath && (
              <Link
                to={receiptPath}
                className="inline-block mt-6 mr-3 px-5 py-3 rounded-xl font-semibold text-white"
                style={{ background: "var(--accent-teal)" }}
              >
                View receipt
              </Link>
            )}
            {back}
          </>
        )}
        {(state === "checking" || state === "pending") && (
          <>
            <h1
              className="font-heading text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Confirming your payment…
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              This usually takes a few seconds. For Mobile Money, approve the prompt on your phone.
              Keep this page open.
            </p>
          </>
        )}
        {state === "slow" && (
          <>
            <h1
              className="font-heading text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Still waiting for Paystack
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              If you approved the payment, you don't need to do anything. We'll email your receipt
              as soon as Paystack confirms it.
            </p>
            {back}
          </>
        )}
        {(state === "failed" || state === "duplicate") && (
          <>
            <h1
              className="font-heading text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {state === "duplicate"
                ? "This stage was already paid"
                : "The payment didn't go through"}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {state === "duplicate"
                ? "We've flagged the extra payment and will refund it. No action needed."
                : "Nothing was recorded against your quote. You can try again from your quote page."}
            </p>
            {back}
          </>
        )}
      </QuoteCard>
    </QuoteShell>
  );
}
