// Loads Paystack Inline JS v2 without disturbing v1.
//
// CardPayment and MomoPayment use Inline v1, whose entry point is the
// `PaystackPop` global with a static `.setup()`. v2 ALSO defines `PaystackPop`,
// but as a class with `newTransaction()` and no `.setup()`. If v2 were left in
// place, CardPayment's `if (window.PaystackPop) resolve()` short-circuit would
// skip loading v1 and then call an undefined `.setup()`, breaking the card flow
// for anyone who opened a v2 page first.
//
// So: snapshot `PaystackPop`, load v2, keep only v2's `Paystack` global, and
// put `PaystackPop` back exactly as it was (deleting it if it was never there).

export interface PaystackTransactionCallbacks {
  onSuccess?: (transaction: { reference?: string }) => void;
  onCancel?: () => void;
  onError?: (error: { message?: string }) => void;
}

export interface PaystackV2 {
  paymentRequest: (options: Record<string, unknown>) => Promise<unknown>;
  /** Opens checkout for a transaction initialised on the server. */
  resumeTransaction: (accessCode: string, callbacks?: PaystackTransactionCallbacks) => unknown;
}

interface PaystackGlobals {
  Paystack?: new () => PaystackV2;
  PaystackPop?: unknown;
}

export function loadPaystackV2(): Promise<PaystackV2> {
  const w = window as unknown as PaystackGlobals;

  return new Promise((resolve, reject) => {
    if (w.Paystack) {
      resolve(new w.Paystack());
      return;
    }

    const hadPaystackPop = "PaystackPop" in w;
    const previousPaystackPop = w.PaystackPop;
    const restorePaystackPop = () => {
      if (hadPaystackPop) w.PaystackPop = previousPaystackPop;
      else delete w.PaystackPop;
    };

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.onload = () => {
      const Ctor = w.Paystack;
      restorePaystackPop();
      if (!Ctor) {
        reject(new Error("Paystack v2 loaded but exposed no Paystack global"));
        return;
      }
      resolve(new Ctor());
    };
    script.onerror = () => {
      restorePaystackPop();
      reject(new Error("Failed to load Paystack v2"));
    };
    document.body.appendChild(script);
  });
}
