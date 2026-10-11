// POST /api/quote-admin — every admin action on quotes, behind the admin
// session. Totals, numbers, tokens and status moves are all decided here.

const { requireAdmin } = require("../shared/adminAuth");
const { send, readJson, handleError } = require("../shared/http");
const { createServices } = require("../shared/quotes/service");
const actions = require("./actions");

function createHandler(deps) {
  return async function (context, req) {
    const auth = await deps.requireAdmin(context, req);
    if (!auth || !auth.user)
      return send(context, (auth && auth.status) || 401, {
        error: (auth && auth.error) || "Sign in again.",
      });
    try {
      const { action, ...input } = readJson(req);
      const fn = Object.prototype.hasOwnProperty.call(actions, action) ? actions[action] : null;
      if (!fn) return send(context, 400, { error: `Unknown action: ${String(action)}` });
      const body = await fn(deps.services(), input, { admin: auth.user });
      return send(context, 200, body);
    } catch (err) {
      return handleError(context, err, "quote-admin");
    }
  };
}

module.exports = createHandler({ requireAdmin, services: createServices });
module.exports.createHandler = createHandler;
