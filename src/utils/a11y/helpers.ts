/**
 * A11y Utility Functions
 * @module utils/a11y/helpers
 */

/**
 * Generates a unique ID for form elements
 */
export function generateId(prefix = "a11y"): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Checks if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Checks if high contrast mode is preferred
 */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-contrast: high)").matches;
}

/**
 * Gets the user's preferred color scheme
 */
export function getColorSchemePreference(): "dark" | "light" | "no-preference" {
  if (typeof window === "undefined") return "no-preference";
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  if (window.matchMedia("(prefers-color-scheme: light)").matches)
    return "light";
  return "no-preference";
}
