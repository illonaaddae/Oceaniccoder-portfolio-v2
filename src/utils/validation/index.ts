/**
 * Validation Utilities - Barrel export
 * @module utils/validation
 */

export type { ValidationResult, FormValidationErrors } from "./types";
export { sanitizeString, escapeHtml } from "./sanitize";
export {
  validateEmail,
  validateName,
  validateMessage,
  validateUrl,
  validateSubject,
} from "./validators";
export { validateContactForm } from "./formValidation";
export { isRateLimited, clearRateLimit } from "./rateLimit";
