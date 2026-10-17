// Confirms a request comes from the signed-in admin. Used by /api/manage,
// send-newsletter and the other admin-only Functions. Two ways in:
//
// 1. A Static Web Apps session (GitHub). The admin role in
//    x-ms-client-principal is re-checked against ADMIN_USER_IDS (see
//    api/shared/principal.js), and because the session is a cookie,
//    cross-site requests and non-JSON POSTs are refused (crossSiteError).
// 2. Until the Appwrite cutover, a short-lived Appwrite JWT
//    (account.createJWT() in the browser), tried from x-appwrite-jwt, then the
//    body, then Authorization, because Static Web Apps can put its own token
//    in Authorization. The account's email must match ADMIN_EMAIL (or
//    VITE_ADMIN_EMAIL, which Azure still has left over from the build).
//
// A signed-in user who isn't the admin gets 403; no sign-in at all gets 401.
// Fails closed: with no admin configured, every caller is refused (500).

const { Client, Account } = require("node-appwrite");
const { adminUserIds, readPrincipal, isAdmin } = require("./principal");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const NOT_ADMIN = "This account isn't the site admin.";

function readJwtCandidates(req) {
  const headers = req.headers || {};
  const candidates = [];
  const add = (token) => {
    const t = (token || "").trim();
    if (t && !candidates.includes(t)) candidates.push(t);
  };
  add(headers["x-appwrite-jwt"] || headers["X-Appwrite-JWT"]);
  add(req.body && req.body.jwt);
  const auth = (headers.authorization || headers.Authorization || "").trim();
  if (auth.startsWith("Bearer ")) add(auth.slice(7));
  return candidates;
}

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

  const adminEmail = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || "").toLowerCase();
  if (!adminEmail && adminUserIds(process.env).size === 0) {
    context.log.error("Admin check: none of ADMIN_USER_IDS, ADMIN_EMAIL, VITE_ADMIN_EMAIL is set");
    return { status: 500, error: "The server has no admin account configured." };
  }

  // Appwrite sign-in, until the cutover removes it. A GitHub user who isn't
  // the admin still gets this chance, in case they also hold an Appwrite token.
  const candidates = adminEmail ? readJwtCandidates(req) : [];
  if (candidates.length === 0) {
    if (principal) {
      context.log.warn("Admin check: refused non-admin sign-in", principal.userId);
      return { status: 403, error: NOT_ADMIN };
    }
    return { status: 401, error: "No session token. Reload the dashboard and try again." };
  }

  for (const jwt of candidates) {
    try {
      const client = new Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setJWT(jwt);
      const user = await new Account(client).get();
      if (user.email?.toLowerCase() === adminEmail) return { user };
      context.log.warn("Admin check: refused non-admin account", user.$id);
      return { status: 403, error: NOT_ADMIN };
    } catch (err) {
      context.log.warn(`Admin check: token candidate rejected (len ${jwt.length}): ${err.message}`);
    }
  }
  return { status: 401, error: "Your session was not accepted. Sign out and back in, then retry." };
}

module.exports = { requireAdmin, readJwtCandidates };
