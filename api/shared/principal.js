// Static Web Apps sign-in: who is calling, and whether they're the admin.
//
// Sign-in goes through two custom providers configured in
// public/staticwebapp.config.json: "github" and "entra" (email + password via
// Microsoft Entra External ID). After each sign-in, SWA calls /api/get-roles,
// which uses rolesFor() below; the roles it returns ride along on every later
// request in the x-ms-client-principal header. SWA sets that header itself and
// drops any copy a client sends, so Functions can trust it.
//
// The admin is identified by SWA's userId for that sign-in, never by a name or
// email: display names and the email claim can be set or changed by the user,
// and GitHub usernames can be renamed and re-registered by someone else. The
// login page shows a signed-in user their id, to copy into ADMIN_USER_IDS.

const ADMIN_ROLE = "admin";
const PROVIDERS = new Set(["github", "entra"]);

/** ADMIN_USER_IDS: comma-separated SWA user ids (one per sign-in method). */
function adminUserIds(env) {
  return new Set(
    String(env.ADMIN_USER_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

/**
 * Roles for a just-signed-in user (the /api/get-roles payload). Fails closed:
 * with ADMIN_USER_IDS unset, nobody is admin.
 */
function rolesFor(payload, env = process.env) {
  if (!payload || !PROVIDERS.has(payload.identityProvider)) return [];
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  return userId && adminUserIds(env).has(userId) ? [ADMIN_ROLE] : [];
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
