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

export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const storedHash = await getSetting("admin_password_hash");
    if (!storedHash) {
      // Fall back to env hash (never plaintext)
      const envHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH;
      if (envHash) {
        const inputHash = await hashPassword(password);
        if (inputHash === envHash) {
          // Migrate to DB-stored hash on first successful login
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
