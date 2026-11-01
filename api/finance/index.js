// POST /api/finance — the owner's private finance ledger, behind the admin
// session. Nothing here is reachable from the public site or /api/data.

const { requireAdmin } = require("../shared/adminAuth");
const { send, readJson, handleError } = require("../shared/http");
const { createCosmosFinanceRepo } = require("../shared/finance/repo");
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
      const body = await fn(deps.repo(), input, deps.now());
      return send(context, 200, body);
    } catch (err) {
      return handleError(context, err, "finance");
    }
  };
}

let repo;
module.exports = createHandler({
  requireAdmin,
  repo: () => (repo ??= createCosmosFinanceRepo()),
  now: () => new Date(),
});
module.exports.createHandler = createHandler;
