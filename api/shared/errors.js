/* global module */
// A readable reason for logs and owner alerts. Some errors carry no message:
// the Cosmos SDK reports a refused connection as a RestError with message ""
// and code "ECONNREFUSED", which would otherwise log as a blank.

function errorReason(err) {
  if (err && typeof err === "object") return String(err.message || err.code || err.name || err);
  return String(err);
}

module.exports = { errorReason };
