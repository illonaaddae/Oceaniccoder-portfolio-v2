import { account } from "./client";
import { usesCosmos } from "./dataApi";

/**
 * Headers for admin-only Azure Functions (media, outgoing email, /api/manage),
 * checked by api/shared/adminAuth.js. With Static Web Apps sign-in the session
 * cookie travels with same-origin requests on its own; with Appwrite the
 * browser sends a short-lived JWT.
 */
export async function adminHeaders(): Promise<Record<string, string>> {
  if (usesCosmos) return { "Content-Type": "application/json" };
  let jwt: string;
  try {
    ({ jwt } = await account.createJWT());
  } catch {
    throw new Error("Your admin session has expired. Sign in again and retry.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
    // Sent alongside Authorization because Static Web Apps can replace that header.
    "x-appwrite-jwt": jwt,
  };
}
