// Loads Paystack Inline JS v1 for the invoice card and Mobile Money flows.
//
// Check for v1's `.setup()` specifically, not just the global. Inline v2
// (loaded by ApplePayPayment and quote checkout) also defines `PaystackPop`,
// as a class with no `.setup()`, or leaves it `undefined` once it's done.

export interface PaystackV1 {
  setup: (config: Record<string, unknown>) => { openIframe: () => void };
}

/** A blocked or stalled script fires neither load nor error; give up after this. */
const LOAD_TIMEOUT_MS = 10_000;

function asV1(candidate: unknown): PaystackV1 | null {
  return candidate && typeof (candidate as { setup?: unknown }).setup === "function"
    ? (candidate as PaystackV1)
    : null;
}

export function loadPaystackV1(): Promise<PaystackV1> {
  const w = window as unknown as { PaystackPop?: unknown };

  return new Promise((resolve, reject) => {
    const ready = asV1(w.PaystackPop);
    if (ready) {
      resolve(ready);
      return;
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new Error("Loading Paystack timed out"))),
      LOAD_TIMEOUT_MS,
    );

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () =>
      finish(() => {
        const pop = asV1(w.PaystackPop);
        if (pop) resolve(pop);
        else reject(new Error("Paystack v1 loaded but exposed no setup()"));
      });
    script.onerror = () => finish(() => reject(new Error("Failed to load Paystack")));
    document.body.appendChild(script);
  });
}
