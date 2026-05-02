// Resolves /api/* URLs.
// On Netlify-served deploys, calls stay relative ("/api/foo").
// On Azure-served deploys, set VITE_FUNCTIONS_BASE_URL=https://your-site.netlify.app
// at build time so calls go to the Netlify functions cross-origin.
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_FUNCTIONS_BASE_URL as string | undefined) || "";
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}
