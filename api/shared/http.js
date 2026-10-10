// Small helpers shared by the quote functions: JSON responses, a body size
// limit, and an error type that carries its HTTP status.

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const MAX_BODY = 64 * 1024;

function send(context, status, body) {
  context.res = { status, headers: HEADERS, body: JSON.stringify(body) };
}

function readJson(req) {
  const raw =
    typeof req.rawBody === "string" && req.rawBody ? req.rawBody : JSON.stringify(req.body ?? "");
  if (raw.length > MAX_BODY) throw new HttpError(413, "Request is too large.");
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    throw new HttpError(400, "Send a JSON body.");
  return req.body;
}

function handleError(context, err, label) {
  if (err instanceof HttpError)
    return send(context, err.status, { error: err.message, ...err.extra });
  context.log.error(`${label}: ${err && (err.stack || err.message)}`);
  return send(context, 500, { error: "Something went wrong on our side. Please try again." });
}

function str(v, max = 10000) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

module.exports = { HttpError, send, readJson, handleError, str };
