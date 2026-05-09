/** Navigation constants and style helpers */

export const LOGO_PATHS = {
  dark: "/images/logo/Oceaniccoder-croped.svg",
  light: "/images/logo/Oceaniccoder-croped.png",
};

export const NAV_BASE_CLASS =
  "px-3 py-2 text-sm font-medium rounded-full transition-all duration-300";

export const MOBILE_BASE_CLASS =
  "text-left py-3 px-4 rounded-xl transition-all duration-300";

export function getNavActiveClass(theme) {
  return theme === "dark"
    ? "text-oceanic-500 bg-oceanic-500/20"
    : "text-oceanic-600 bg-oceanic-50";
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
