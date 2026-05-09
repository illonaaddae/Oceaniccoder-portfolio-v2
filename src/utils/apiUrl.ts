// Resolves /api/* URLs.
// VITE_FUNCTIONS_BASE_URL is intentionally unset — Azure Functions in api/ handle
// /api/* on the same domain (oceaniccoder.dev), so relative paths work directly.
// Set VITE_FUNCTIONS_BASE_URL only if functions move to a different origin.
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_FUNCTIONS_BASE_URL as string | undefined) || "";
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}
