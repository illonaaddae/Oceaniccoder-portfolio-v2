import { hasSwaAdminSession, logoutUrl } from "./session";

/** True when the admin is signed in: a Static Web Apps session with the admin role. */
export async function hasAdminSession(): Promise<boolean> {
  return hasSwaAdminSession();
}

export function logoutAdmin(): void {
  window.location.assign(logoutUrl());
}
