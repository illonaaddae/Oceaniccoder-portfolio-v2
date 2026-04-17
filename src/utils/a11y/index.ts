/**
 * Accessibility Utilities - Barrel export
 * @module utils/a11y
 */

export type { A11yCheckResult, A11yIssue } from "./types";
export { trapFocus, announce } from "./focusManagement";
export { handleArrowNavigation } from "./keyboardNav";
export { checkElementA11y, auditContainer } from "./checks";
export {
  generateId,
  prefersReducedMotion,
  prefersHighContrast,
  getColorSchemePreference,
} from "./helpers";
