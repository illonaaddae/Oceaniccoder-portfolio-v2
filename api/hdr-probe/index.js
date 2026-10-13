// TEMPORARY probe (never merged): shows which forwarding headers reach a Function on SWA.
module.exports = async function (context, req) {
  const h = req.headers || {};
  const pick = Object.keys(h)
    .filter((k) => /forwarded|client-?ip|real-ip|socket|azure|x-arr|x-original|cf-|true-client|x-ms-/i.test(k))
    .sort()
    .reduce((o, k) => ((o[k] = h[k]), o), {});
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: { names: Object.keys(h).sort(), forwarding: pick },
  };
};
