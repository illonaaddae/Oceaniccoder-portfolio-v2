/**
 * Static Web Apps sign-in for the admin (used once VITE_DATA_BACKEND=cosmos).
 * Two providers, set up in public/staticwebapp.config.json: GitHub, and email
 * + password through Microsoft Entra External ID ("entra"). The admin role is
 * assigned on the server by /api/get-roles; the browser only reads it.
 */

export type LoginProvider = "github" | "entra";

interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

/** The signed-in user, or null. Never throws. */
export async function getSwaUser(): Promise<ClientPrincipal | null> {
  try {
    const res = await fetch("/.auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const { clientPrincipal } = (await res.json()) as { clientPrincipal: ClientPrincipal | null };
    return clientPrincipal;
  } catch {
    return null;
  }
}

/** True when the signed-in user holds the admin role. */
export async function hasSwaAdminSession(): Promise<boolean> {
  const user = await getSwaUser();
  return Boolean(user?.userRoles.includes("admin"));
}

export function loginUrl(provider: LoginProvider, returnTo = "/admin/dashboard"): string {
  return `/.auth/login/${provider}?post_login_redirect_uri=${encodeURIComponent(returnTo)}`;
}

export function logoutUrl(returnTo = "/"): string {
  return `/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(returnTo)}`;
}
