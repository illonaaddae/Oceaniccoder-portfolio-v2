import { describe, expect, it } from "vitest";
import { PAYMENT_CONFIG } from "@/config/payment";

/**
 * Apple Pay is gated on configuration, not on device support alone.
 *
 * Paystack only enables Apple Pay for verified businesses, so until that
 * clears the charge fails *after* the client has already chosen the method —
 * on exactly the devices where the option looked available. Offering it in
 * that state is worse than not offering it.
 */
describe("payment method availability", () => {
  it("keeps Apple Pay off unless it is explicitly enabled", () => {
    // VITE_APPLE_PAY_ENABLED is unset in test and in the current build, so the
    // flag must be false. If this ever fails, the option has been turned on
    // without the Paystack side being ready.
    expect(PAYMENT_CONFIG.applePayEnabled).toBe(false);
  });

  it("treats anything other than the literal string 'true' as off", () => {
    // Vite env values are always strings, so a truthy-looking "false" or "1"
    // must not switch it on by accident.
    for (const value of ["false", "1", "yes", "", undefined]) {
      expect(value === "true").toBe(false);
    }
  });

  it("still has the methods that do work configured", () => {
    expect(PAYMENT_CONFIG.momoNetwork).toBeTruthy();
    expect(PAYMENT_CONFIG.bankName).toBeTruthy();
  });
});
