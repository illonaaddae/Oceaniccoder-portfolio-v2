// Confirms a request comes from the signed-in admin. Used by /api/manage,
// send-newsletter and the other admin-only Functions. The only way in is a
// Static Web Apps session (GitHub): the admin role in x-ms-client-principal
// is re-checked against ADMIN_USER_IDS (see api/shared/principal.js), and
// because the session is a cookie, cross-site requests and non-JSON POSTs are
// refused (crossSiteError).
//
// A signed-in user who isn't the admin gets 403; no sign-in at all gets 401.
// Fails closed: with no admin configured, every caller is refused (500).

const { adminUserIds, readPrincipal, isAdmin } = require("./principal");

const NOT_ADMIN = "This account isn't the site admin.";

// Sec-Fetch-Site values for a request the dashboard itself made ("none" is
// the admin typing the URL). Absent means a client that doesn't send it.
const OWN_ORIGIN = new Set(["same-origin", "none"]);

/**
 * The SWA session is a cookie, so a hostile page could make the admin's
 * browser send it. Requests from any other origin are refused outright,
 * including same-site ones (another subdomain), and a POST must be JSON: a
 * cross-site form or no-cors fetch can only send text/plain, form-encoded or
 * multipart without a CORS preflight.
 */
function crossSiteError(req) {
  const headers = req.headers || {};
  const site = headers["sec-fetch-site"];
  if (site && !OWN_ORIGIN.has(site)) return "Cross-site requests are not accepted.";
  const type = String(headers["content-type"] || "").toLowerCase();
  if (req.method === "POST" && !type.startsWith("application/json")) return "Send JSON.";
  return null;
}

/**
 * Returns { user } for the admin, or { status, error } to send back.
 */
async function requireAdmin(context, req) {
  // Static Web Apps sign-in (GitHub): the admin role was
  // assigned by /api/get-roles and SWA vouches for it in this header.
  const principal = readPrincipal(req);
  if (isAdmin(principal)) {
    const refused = crossSiteError(req);
    if (refused) return { status: 403, error: refused };
    return { user: { email: principal.userDetails, provider: principal.identityProvider } };
  }

  if (adminUserIds(process.env).size === 0) {
    context.log.error("Admin check: ADMIN_USER_IDS is not set");
    return { status: 500, error: "The server has no admin account configured." };
  }
  if (principal) {
    context.log.warn("Admin check: refused non-admin sign-in", principal.userId);
    return { status: 403, error: NOT_ADMIN };
  }
  return { status: 401, error: "Sign in to the dashboard and try again." };
}

module.exports = { requireAdmin };
