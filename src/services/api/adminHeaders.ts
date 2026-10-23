/**
 * Headers for admin-only Azure Functions (media, outgoing email, /api/manage),
 * checked by api/shared/adminAuth.js. The Static Web Apps session cookie
 * travels with same-origin requests on its own, so only the content type is set.
 */
export async function adminHeaders(): Promise<Record<string, string>> {
  return { "Content-Type": "application/json" };
}
