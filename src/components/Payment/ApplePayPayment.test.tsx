import React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ApplePayPayment from "./ApplePayPayment";

const invoice = {
  invoiceNumber: "INV-000001",
  clientEmail: "client@example.com",
  total: 42.5,
  currency: "USD",
  clientName: "Test Client",
};

type Mutable = Record<string, unknown>;

// Structural stand-in for the injected script element. The DOM lib type names
// (Node, HTMLScriptElement) are not in this project's ESLint globals, so
// referencing them trips no-undef even though TypeScript resolves them fine.
interface ScriptLike {
  nodeName: string;
  onload?: ((event: unknown) => void) | null;
  onerror?: ((event: unknown) => void) | null;
}

// Stands in for Inline v1's global: an object carrying a static `setup`.
const v1Global = { setup: () => ({ openIframe: () => {} }) };

// Simulates the v2 script tag loading. `elements` is what Paystack reports to
// onElementsMount — an object when the Apple Pay button mounted, null when the
// device has no Apple Pay support. `fail: true` simulates a network failure.
function stubScriptLoad(options: { elements: { applePay?: boolean } | null; fail?: boolean }) {
  // Must pass non-script nodes straight through. React Testing Library mounts
  // its container by calling document.body.appendChild, and swallowing that call
  // both breaks rendering and sets the Paystack globals before the component's
  // loader runs — which would send it down the early-return path and skip the
  // global-restore this file is here to verify.
  const realAppendChild = document.body.appendChild.bind(document.body);

  const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation(((
    node: ScriptLike,
  ): unknown => {
    if (node.nodeName !== "SCRIPT") return realAppendChild(node as never);

    const script = node;

    if (options.fail) {
      setTimeout(() => script.onerror?.(new Event("error")), 0);
      return node;
    }

    // v2 defines BOTH globals. PaystackPop here is the v2 class shape — note
    // it has no `.setup()`, which is exactly what would break Inline v1.
    (window as unknown as Mutable).Paystack = class {
      paymentRequest(opts: Record<string, unknown>) {
        const onElementsMount = opts.onElementsMount as (e: { applePay?: boolean } | null) => void;
        onElementsMount(options.elements);
        return Promise.resolve();
      }
    };
    (window as unknown as Mutable).PaystackPop = class {
      newTransaction() {}
    };

    setTimeout(() => script.onload?.(new Event("load")), 0);
    return node;
  }) as never);

  return appendChild;
}

describe("ApplePayPayment", () => {
  beforeEach(() => {
    delete (window as unknown as Mutable).Paystack;
    delete (window as unknown as Mutable).PaystackPop;
    // jsdom has no ApplePaySession; the component now gates on it, so tests
    // that expect a mount attempt must opt in.
    (window as unknown as Mutable).ApplePaySession = class {};
  });

  afterEach(() => {
    delete (window as unknown as Mutable).ApplePaySession;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Guards the blast radius: ApplePayPayment is mounted-but-hidden on every
  // payment page view, so without this gate every visitor on every browser
  // would load Inline v2 and exercise the PaystackPop global swap that the card
  // and momo flows must survive.
  it("does not load Paystack v2 at all when the device has no Apple Pay API", async () => {
    delete (window as unknown as Mutable).ApplePaySession;
    const appendChild = stubScriptLoad({ elements: { applePay: true } });
    const onAvailability = vi.fn();

    render(
      <ApplePayPayment invoice={invoice} onSuccess={() => {}} onAvailability={onAvailability} />,
    );

    await waitFor(() => expect(onAvailability).toHaveBeenCalledWith(false));

    const scriptAppends = appendChild.mock.calls.filter(
      ([node]) => (node as unknown as ScriptLike).nodeName === "SCRIPT",
    );
    expect(scriptAppends).toHaveLength(0);
    expect((window as unknown as Mutable).Paystack).toBeUndefined();
  });

  it("reports available when Paystack mounts the Apple Pay button", async () => {
    stubScriptLoad({ elements: { applePay: true } });
    const onAvailability = vi.fn();

    render(
      <ApplePayPayment invoice={invoice} onSuccess={() => {}} onAvailability={onAvailability} />,
    );

    await waitFor(() => expect(onAvailability).toHaveBeenCalledWith(true));
  });

  it("reports unavailable when the device has no Apple Pay support", async () => {
    stubScriptLoad({ elements: null });
    const onAvailability = vi.fn();

    render(
      <ApplePayPayment invoice={invoice} onSuccess={() => {}} onAvailability={onAvailability} />,
    );

    await waitFor(() => expect(onAvailability).toHaveBeenCalledWith(false));
  });

  it("reports unavailable when the Paystack script fails to load", async () => {
    stubScriptLoad({ elements: null, fail: true });
    const onAvailability = vi.fn();

    render(
      <ApplePayPayment invoice={invoice} onSuccess={() => {}} onAvailability={onAvailability} />,
    );

    await waitFor(() => expect(onAvailability).toHaveBeenCalledWith(false));
  });

  // Regression guard. Inline v2 overwrites the `PaystackPop` global with a class
  // that has no `.setup()`. CardPayment and MomoPayment resolve their loader as
  // soon as they see a usable `PaystackPop`, so if v2's version were left in
  // place the card and momo flows would break for anyone who opened the Apple
  // Pay tab first.
  it("restores a pre-existing v1 PaystackPop global after loading v2", async () => {
    (window as unknown as Mutable).PaystackPop = v1Global;
    stubScriptLoad({ elements: { applePay: true } });
    const onAvailability = vi.fn();

    render(
      <ApplePayPayment invoice={invoice} onSuccess={() => {}} onAvailability={onAvailability} />,
    );

    await waitFor(() => expect(onAvailability).toHaveBeenCalledWith(true));
    expect((window as unknown as Mutable).PaystackPop).toBe(v1Global);
  });

  it("removes the PaystackPop global entirely when v1 was never loaded", async () => {
    stubScriptLoad({ elements: { applePay: true } });
    const onAvailability = vi.fn();

    render(
      <ApplePayPayment invoice={invoice} onSuccess={() => {}} onAvailability={onAvailability} />,
    );

    await waitFor(() => expect(onAvailability).toHaveBeenCalledWith(true));
    expect("PaystackPop" in window).toBe(false);
  });
});
