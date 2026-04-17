/**
 * Field Validators
 * @module utils/validation/validators
 */

import { sanitizeString } from "./sanitize";
import type { ValidationResult } from "./types";

/**
 * Validates an email address
 */
export function validateEmail(email: string): ValidationResult {
  const sanitized = sanitizeString(email).toLowerCase();

  if (!sanitized) {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  if (sanitized.length > 254) {
    return { isValid: false, error: "Email address is too long" };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates a name field
 */
export function validateName(
  name: string,
  minLength = 2,
  maxLength = 100,
): ValidationResult {
  const suspiciousPatterns =
    /(<script|<\/script|select\s+\*|drop\s+table|union\s+select|insert\s+into|<[^>]*>)/i;
  if (suspiciousPatterns.test(name)) {
    return { isValid: false, error: "Invalid characters detected" };
  }

  const sanitized = sanitizeString(name);
  if (!sanitized) return { isValid: false, error: "Name is required" };
  if (sanitized.length < minLength)
    return {
      isValid: false,
      error: `Name must be at least ${minLength} characters`,
    };
  if (sanitized.length > maxLength)
    return {
      isValid: false,
      error: `Name must be less than ${maxLength} characters`,
    };

  return { isValid: true, sanitized };
}

/**
 * Validates a message/text area content
 */
export function validateMessage(
  message: string,
  minLength = 10,
  maxLength = 5000,
): ValidationResult {
  const sanitized = sanitizeString(message);
  if (!sanitized) return { isValid: false, error: "Message is required" };
  if (sanitized.length < minLength)
    return {
      isValid: false,
      error: `Message must be at least ${minLength} characters`,
    };
  if (sanitized.length > maxLength)
    return {
      isValid: false,
      error: `Message must be less than ${maxLength} characters`,
    };

  return { isValid: true, sanitized };
}

/**
 * Validates a URL
 */
export function validateUrl(
  url: string,
  allowedProtocols: string[] = ["https:", "http:"],
): ValidationResult {
  const sanitized = sanitizeString(url);
  if (!sanitized) return { isValid: true, sanitized: "" };

  try {
    const parsedUrl = new URL(sanitized);
    if (!allowedProtocols.includes(parsedUrl.protocol))
      return { isValid: false, error: "URL must use HTTPS or HTTP protocol" };
    if (parsedUrl.protocol === "javascript:" || parsedUrl.protocol === "data:")
      return { isValid: false, error: "Invalid URL protocol" };
    return { isValid: true, sanitized: parsedUrl.href };
  } catch {
    return { isValid: false, error: "Please enter a valid URL" };
  }
}

/**
 * Validates a subject line
 */
export function validateSubject(subject: string): ValidationResult {
  const sanitized = sanitizeString(subject);
  if (!sanitized) return { isValid: false, error: "Subject is required" };
  if (sanitized.length < 3)
    return { isValid: false, error: "Subject must be at least 3 characters" };
  if (sanitized.length > 200)
    return {
      isValid: false,
      error: "Subject must be less than 200 characters",
    };

  return { isValid: true, sanitized };
}
