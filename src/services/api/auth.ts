import { account } from "../../lib/appwrite";
import { getSetting, setSetting } from "./settings";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function setAdminPassword(newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword);
  await setSetting("admin_password_hash", hash);
}

// True if an active Appwrite session exists for this browser
export async function hasAppwriteSession(): Promise<boolean> {
  try {
    await account.get();
    return true;
  } catch {
    return false;
  }
}

// Tries Appwrite Auth first (if VITE_ADMIN_EMAIL is set & user exists in Appwrite Console)
// Falls back to the legacy SHA-256 hash check so existing setups keep working
export async function verifyAdminPassword(password: string): Promise<boolean> {
  // Path 1 — real Appwrite Auth (preferred)
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (adminEmail) {
    try {
      // Clear any stale session before creating a new one
      try { await account.deleteSession("current"); } catch { /* no session — fine */ }
      // Newer Appwrite SDKs: createEmailPasswordSession; older: createEmailSession
      const acc = account as unknown as Record<string, (e: string, p: string) => Promise<unknown>>;
      const fn = acc.createEmailPasswordSession || acc.createEmailSession;
      if (typeof fn === "function") {
        await fn.call(account, adminEmail, password);
        return true;
      }
    } catch {
      // Fall through to legacy auth
    }
  }

  // Path 2 — legacy SHA-256 hash (settings collection or env var)
  try {
    const storedHash = await getSetting("admin_password_hash");
    if (!storedHash) {
      const envHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH;
      if (envHash) {
        const inputHash = await hashPassword(password);
        if (inputHash === envHash) {
          await setAdminPassword(password);
          return true;
        }
      }
      return false;
    }
    const inputHash = await hashPassword(password);
    return inputHash === storedHash.value;
  } catch {
    const envHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH;
    if (!envHash) return false;
    const inputHash = await hashPassword(password);
    return inputHash === envHash;
  }
}

export async function logoutAdmin(): Promise<void> {
  try { await account.deleteSession("current"); } catch { /* no session */ }
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
