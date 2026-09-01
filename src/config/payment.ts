export const PAYMENT_CONFIG = {
  bankName: import.meta.env.VITE_BANK_NAME || "GCB Bank",
  bankAccountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || "Illona Addae",
  bankAccountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "XXXXXXXXXXXX",
  momoNumber: import.meta.env.VITE_MOMO_NUMBER || "0XX XXX XXXX",
  momoNetwork: import.meta.env.VITE_MOMO_NETWORK || "MTN MoMo",
  paystackPublicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string,
  /**
   * Off until Paystack verifies the business — Apple Pay is gated behind that,
   * so until it clears, the charge fails for the client after they have picked
   * the method. Device support alone is not enough to offer it.
   *
   * Set VITE_APPLE_PAY_ENABLED=true in the GitHub Actions secrets to turn it
   * back on; nothing else needs to change.
   */
  applePayEnabled: import.meta.env.VITE_APPLE_PAY_ENABLED === "true",
};
