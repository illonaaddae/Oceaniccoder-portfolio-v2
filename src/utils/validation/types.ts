/**
 * Validation Types
 * @module utils/validation/types
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export interface FormValidationErrors {
  [field: string]: string | undefined;
}
