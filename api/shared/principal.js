// Static Web Apps sign-in: who is calling, and whether they're the admin.
//
// Sign-in goes through two custom providers configured in
// public/staticwebapp.config.json: "github" and "entra" (email + password via
// Microsoft Entra External ID). After each sign-in, SWA calls /api/get-roles,
// which uses rolesFor() below; the roles it returns ride along on every later
// request in the x-ms-client-principal header. SWA sets that header itself and
// drops any copy a client sends, so Functions can trust it.

const ADMIN_ROLE = "admin";

// Claims that can carry the signed-in email for the Entra provider.
const EMAIL_CLAIMS = new Set([
  "email",
  "emails",
  "preferred_username",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
]);

const normalise = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

/**
 * Roles for a just-signed-in user (the /api/get-roles payload). Fails closed:
 * with ADMIN_GITHUB_LOGIN and ADMIN_EMAIL unset, nobody is admin.
 */
function rolesFor(payload, env = process.env) {
  const provider = payload && payload.identityProvider;
  const adminLogin = normalise(env.ADMIN_GITHUB_LOGIN);
  const adminEmail = normalise(env.ADMIN_EMAIL);

  if (provider === "github" && adminLogin && normalise(payload.userDetails) === adminLogin) {
    return [ADMIN_ROLE];
  }
  if (provider === "entra" && adminEmail) {
    const emails = [payload.userDetails]
      .concat((payload.claims || []).filter((c) => EMAIL_CLAIMS.has(c.typ)).map((c) => c.val))
      .map(normalise);
    if (emails.includes(adminEmail)) return [ADMIN_ROLE];
  }
  return [];
}

/** The signed-in user from x-ms-client-principal, or null. */
function readPrincipal(req) {
  const header = req.headers && req.headers["x-ms-client-principal"];
  if (!header) return null;
  try {
    const principal = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    return principal && principal.userId ? principal : null;
  } catch {
    return null;
  }
}

function isAdmin(principal) {
  return Boolean(principal && (principal.userRoles || []).includes(ADMIN_ROLE));
}

module.exports = { ADMIN_ROLE, rolesFor, readPrincipal, isAdmin };
