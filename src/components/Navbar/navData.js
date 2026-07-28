/** Navigation constants and style helpers */

/**
 * Header logo.
 *
 * The light variant used to point at Oceaniccoder-croped.png: 476 KB at
 * 2903x842, to be drawn at 112x32. On a slow mobile connection that had not
 * arrived by the time the rest of the header painted, so the logo simply looked
 * missing. These are the same artwork resized to 336px wide (3x) — 8 KB as WebP,
 * 23 KB as the PNG fallback.
 *
 * Dark still uses the SVG, which is recoloured by a CSS filter into a flat
 * silhouette. It is 748 KB and worth optimising too, but changing it risks
 * altering how that filter renders, so it is left alone here.
 */
export const LOGO_PATHS = {
  dark: "/images/logo/Oceaniccoder-croped.svg",
  light: "/images/logo/Oceaniccoder-logo@3x.png",
  lightWebp: "/images/logo/Oceaniccoder-logo.webp",
};

export const NAV_BASE_CLASS =
  "px-3 py-2 text-sm font-medium rounded-full transition-all duration-300";

export const MOBILE_BASE_CLASS = "text-left py-3 px-4 rounded-xl transition-all duration-300";

export function getNavActiveClass(theme) {
  return theme === "dark" ? "text-oceanic-500 bg-oceanic-500/20" : "text-oceanic-600 bg-oceanic-50";
}

export function getNavInactiveClass(theme) {
  return theme === "dark"
    ? "text-gray-300 hover:text-oceanic-500 hover:bg-white/10"
    : "text-slate-900 hover:text-oceanic-600 hover:bg-gray-100";
}

export function getMobileActiveClass(theme) {
  return theme === "dark"
    ? "text-oceanic-500 bg-oceanic-500/20 border border-oceanic-500/30"
    : "text-oceanic-600 bg-oceanic-50 border border-oceanic-200";
}

export function getMobileInactiveClass(theme) {
  return theme === "dark"
    ? "text-gray-200 hover:text-oceanic-500 hover:bg-white/10"
    : "text-slate-900 hover:text-oceanic-600 hover:bg-gray-100";
}

export const lightStyle = { color: "#0f172a" };
