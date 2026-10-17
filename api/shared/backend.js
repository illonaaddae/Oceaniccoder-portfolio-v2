// Server switches for the Appwrite → Cosmos cutover. The only place that
// reads DATA_BACKEND and WRITE_HOLD, so every function agrees on them.
//
// DATA_BACKEND picks where the server reads and writes: "appwrite" (the
// default while it is unset) or "cosmos". Any other value throws, so a typo
// fails loudly instead of quietly running on the wrong database. Flip it
// together with the build-time VITE_DATA_BACKEND.
//
// WRITE_HOLD=1 pauses the quote service during the data move: its functions
// answer 503, and Paystack retries its webhooks after the hold is lifted.

const BACKENDS = new Set(["appwrite", "cosmos"]);

/** "appwrite" or "cosmos". Throws on any other DATA_BACKEND value. */
function dataBackend(env = process.env) {
  const value = env.DATA_BACKEND;
  if (value === undefined || value === "") return "appwrite";
  if (BACKENDS.has(value)) return value;
  throw new Error(`DATA_BACKEND must be "appwrite" or "cosmos", not "${value}"`);
}

/** True only when WRITE_HOLD is exactly "1". */
function writeHold(env = process.env) {
  return env.WRITE_HOLD === "1";
}

module.exports = { dataBackend, writeHold };
