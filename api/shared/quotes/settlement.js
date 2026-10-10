// Pure payment rules shared by the webhook, the return page and manual
// recording. Kept free of I/O so each decision is testable on its own.

// Paystack reports Mobile Money prompts that are still waiting as "abandoned",
// so only failed and reversed are final failures.
function mapPaystackStatus(status) {
  if (status === "success") return "success";
  if (status === "failed" || status === "reversed") return "failed";
  return "pending";
}

// A charge settles a stage only on an exact amount and currency match.
function checkSettlement({ expectedMinor, expectedCurrency, paidMinor, paidCurrency }) {
  if (!Number.isInteger(expectedMinor) || expectedMinor <= 0)
    return { ok: false, reason: "no-expected-amount" };
  if (String(paidCurrency || "").toUpperCase() !== String(expectedCurrency || "").toUpperCase()) {
    return { ok: false, reason: "currency-mismatch" };
  }
  if (paidMinor !== expectedMinor)
    return { ok: false, reason: paidMinor < expectedMinor ? "underpaid" : "overpaid" };
  return { ok: true };
}

// Apple Pay is checked first: it is a card wallet, so a card-like channel
// name containing "apple" should still be reported as Apple Pay.
function methodFromChannel(channel) {
  const c = String(channel || "").toLowerCase();
  if (c.includes("apple")) return "apple_pay";
  if (c.includes("mobile")) return "momo";
  if (c.includes("bank")) return "bank";
  return "card";
}

function keyMode(secret) {
  if (String(secret).startsWith("sk_live_")) return "live";
  if (String(secret).startsWith("sk_test_")) return "test";
  return "unknown";
}

module.exports = { mapPaystackStatus, checkSettlement, methodFromChannel, keyMode };
