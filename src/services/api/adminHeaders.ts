import { account } from "./client";

/**
 * Headers for admin-only Azure Functions (media, outgoing email). They check
 * the short-lived Appwrite JWT in api/shared/adminAuth.js.
 */
export async function adminHeaders(): Promise<Record<string, string>> {
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
