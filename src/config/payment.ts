export const PAYMENT_CONFIG = {
  bankName: import.meta.env.VITE_BANK_NAME || "GCB Bank",
  bankAccountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || "Illona Addae",
  bankAccountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "XXXXXXXXXXXX",
  momoNumber: import.meta.env.VITE_MOMO_NUMBER || "0XX XXX XXXX",
  momoNetwork: import.meta.env.VITE_MOMO_NETWORK || "MTN MoMo",
  paystackPublicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string,
};
