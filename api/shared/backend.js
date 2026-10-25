// Server switch for data moves. The only place that reads WRITE_HOLD, so
// every function agrees on it.
//
// WRITE_HOLD=1 pauses writes during a data move: the quote functions and the
// Paystack webhook answer 503, and Paystack retries its webhooks after the
// hold is lifted.
// Unset, "" or "0" means off. Any other value throws, so "true" or "yes"
// fails closed (every quote function answers 500) instead of leaving writes
// running during the move.

const HOLD_OFF = new Set([undefined, "", "0"]);

/** True for "1", false for unset, "" or "0". Throws on any other value. */
function writeHold(env = process.env) {
  const value = env.WRITE_HOLD;
  if (value === "1") return true;
  if (HOLD_OFF.has(value)) return false;
  throw new Error(`WRITE_HOLD must be "1" or "0", not "${value}"`);
}

module.exports = { writeHold };
