// Loads Paystack Inline JS v2 without disturbing v1.
//
// CardPayment and MomoPayment use Inline v1, whose entry point is the
// `PaystackPop` global with a static `.setup()`. v2 ALSO defines `PaystackPop`,
// but as a class with `resumeTransaction()` and no `.setup()`. If v2 were left
// in place, CardPayment's `if (window.PaystackPop) resolve()` short-circuit
// would skip loading v1 and then call an undefined `.setup()`, breaking the card
// flow for anyone who opened a v2 page first.
//
// Current v2 builds expose only that `PaystackPop` class (older ones also set a
// `Paystack` global). So: snapshot `PaystackPop`, load v2, keep v2's class for
// ourselves, and put `PaystackPop` back as it was. Today's build declares it
// with a top-level `var`, which can't be deleted, so "never there" becomes
// `undefined`; a throw there once left checkout stuck with no fallback.

export interface PaystackTransactionCallbacks {
  onSuccess?: (transaction: { reference?: string }) => void;
  onCancel?: () => void;
  onError?: (error: { message?: string }) => void;
  /** Paystack's checkout window has loaded and is showing. */
  onLoad?: () => void;
}

export interface PaystackV2 {
  paymentRequest: (options: Record<string, unknown>) => Promise<unknown>;
  /** Opens checkout for a transaction initialised on the server. */
  resumeTransaction: (accessCode: string, callbacks?: PaystackTransactionCallbacks) => unknown;
}

type PaystackV2Ctor = new () => PaystackV2;

interface PaystackGlobals {
  Paystack?: PaystackV2Ctor;
  PaystackPop?: unknown;
}

/** A blocked or stalled script fires neither load nor error; give up after this. */
const LOAD_TIMEOUT_MS = 10_000;

/** v2 is a class with checkout methods on its prototype; v1 is a plain object. */
function asV2Ctor(candidate: unknown): PaystackV2Ctor | null {
  if (typeof candidate !== "function") return null;
  const proto = (candidate as { prototype?: Record<string, unknown> }).prototype;
  return proto &&
    (typeof proto.resumeTransaction === "function" || typeof proto.paymentRequest === "function")
    ? (candidate as PaystackV2Ctor)
    : null;
}

export function loadPaystackV2(): Promise<PaystackV2> {
  const w = window as unknown as PaystackGlobals;

  return new Promise((resolve, reject) => {
    const ready = asV2Ctor(w.Paystack) || asV2Ctor(w.PaystackPop);
    if (ready) {
      resolve(new ready());
      return;
    }

    const hadPaystackPop = "PaystackPop" in w;
    const previousPaystackPop = w.PaystackPop;
    const restorePaystackPop = () => {
      if (hadPaystackPop) w.PaystackPop = previousPaystackPop;
      else if (Object.getOwnPropertyDescriptor(w, "PaystackPop")?.configurable === false)
        w.PaystackPop = undefined;
      else delete w.PaystackPop;
    };

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Never leave the promise hanging: callers fall back on a rejection.
      try {
        fn();
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Loading Paystack failed"));
      }
    };
    const timer = setTimeout(
      () =>
        finish(() => {
          restorePaystackPop();
          reject(new Error("Loading Paystack timed out"));
        }),
      LOAD_TIMEOUT_MS,
    );

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.onload = () =>
      finish(() => {
        const Ctor = asV2Ctor(w.Paystack) || asV2Ctor(w.PaystackPop);
        restorePaystackPop();
        if (!Ctor) {
          reject(new Error("Paystack v2 loaded but exposed no checkout class"));
          return;
        }
        resolve(new Ctor());
      });
    script.onerror = () =>
      finish(() => {
        restorePaystackPop();
        reject(new Error("Failed to load Paystack v2"));
      });
    document.body.appendChild(script);
  });
}
