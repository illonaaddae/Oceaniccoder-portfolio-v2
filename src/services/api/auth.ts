import { account } from "../../lib/appwrite";

// True if an active Appwrite session exists for this browser
export async function hasAppwriteSession(): Promise<boolean> {
  try {
    await account.get();
    return true;
  } catch {
    return false;
  }
}

// Verify admin password via Appwrite Auth. The legacy SHA-256 fallback was
// removed because it required exposing VITE_ADMIN_PASSWORD_HASH in the client
// bundle — anyone inspecting the JS could read the password hash.
//
// Setup requirement: create an admin user in the Appwrite Console, then set
// VITE_ADMIN_EMAIL in GitHub Actions secrets to that user's email.
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!adminEmail) {
    console.error("verifyAdminPassword: VITE_ADMIN_EMAIL is not set — admin auth is disabled.");
    return false;
  }

  try {
    // Clear any stale session before creating a new one
    try {
      await account.deleteSession("current");
    } catch {
      /* no session — fine */
    }
    // Newer Appwrite SDKs: createEmailPasswordSession; older: createEmailSession
    const acc = account as unknown as Record<string, (e: string, p: string) => Promise<unknown>>;
    const fn = acc.createEmailPasswordSession || acc.createEmailSession;
    if (typeof fn === "function") {
      await fn.call(account, adminEmail, password);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await account.deleteSession("current");
  } catch {
    /* no session */
  }
}

// Triggers Appwrite to send a recovery email to the admin
// Returns the email that was used (for UI feedback) or throws if no email configured
export async function requestPasswordRecovery(): Promise<string> {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error("VITE_ADMIN_EMAIL is not set — cannot send recovery email");
  }
  const redirectUrl = `${window.location.origin}/admin/reset-password`;
  await account.createRecovery(adminEmail, redirectUrl);
  return adminEmail;
}

// Completes the recovery flow with the userId + secret from the email link
export async function completePasswordRecovery(
  userId: string,
  secret: string,
  newPassword: string,
): Promise<void> {
  await account.updateRecovery(userId, secret, newPassword);
}
