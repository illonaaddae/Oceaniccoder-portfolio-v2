// Confirms a request comes from the signed-in admin, using a short-lived
// Appwrite JWT (account.createJWT() in the browser). Same transport handling as
// send-newsletter: x-appwrite-jwt first, then the body, then Authorization,
// because Static Web Apps can put its own token in Authorization.
//
// Unlike send-newsletter, this fails closed: with no admin email configured
// every caller is refused. Otherwise any Appwrite account would pass. Azure
// currently has VITE_ADMIN_EMAIL (left over from the build) but not
// ADMIN_EMAIL, so both are accepted.
//
// Also accepts a Static Web Apps session with the admin role (see
// api/shared/principal.js); the Appwrite path goes away at cutover.

const { Client, Account } = require("node-appwrite");
const { readPrincipal, isAdmin } = require("./principal");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";

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

/**
 * Returns { user } for the admin, or { status, error } to send back.
 */
async function requireAdmin(context, req) {
  // Static Web Apps sign-in (GitHub or Entra email): the admin role was
  // assigned by /api/get-roles and SWA vouches for it in this header.
  const principal = readPrincipal(req);
  if (isAdmin(principal)) {
    return { user: { email: principal.userDetails, provider: principal.identityProvider } };
  }

  // Appwrite sign-in, until the cutover removes it.
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || "").toLowerCase();
  if (!adminEmail) {
    context.log.error("Admin check: neither ADMIN_EMAIL nor VITE_ADMIN_EMAIL is set");
    return { status: 500, error: "The server has no admin account configured." };
  }

  const candidates = readJwtCandidates(req);
  if (candidates.length === 0) {
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
      return { status: 403, error: "This account isn't the site admin." };
    } catch (err) {
      context.log.warn(`Admin check: token candidate rejected (len ${jwt.length}): ${err.message}`);
    }
  }
  return { status: 401, error: "Your session was not accepted. Sign out and back in, then retry." };
}

module.exports = { requireAdmin };
