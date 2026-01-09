/**
 * Validation Utilities
 * Production-grade input validation and sanitization
 *
 * @module utils/validation
 */

// ============================================
// Types
// ============================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export interface FormValidationErrors {
  [field: string]: string | undefined;
}

// ============================================
// Sanitization Functions
// ============================================

/**
 * Sanitizes a string by removing potentially dangerous HTML/script content
 * @param input - Raw input string
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";

  return (
    input
      .trim()
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove script injections
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "")
      // Remove null bytes
      .replace(/\0/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
  );
}

/**
 * Escapes HTML entities to prevent XSS
 * @param input - Raw input string
 * @returns Escaped string safe for HTML display
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";

  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validates an email address
 * @param email - Email string to validate
 * @returns ValidationResult with status and sanitized value
 */
export function validateEmail(email: string): ValidationResult {
  const sanitized = sanitizeString(email).toLowerCase();

  if (!sanitized) {
    return { isValid: false, error: "Email is required" };
  }

  // RFC 5322 compliant email regex (simplified)
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
 * @param name - Name string to validate
 * @param minLength - Minimum length (default: 2)
 * @param maxLength - Maximum length (default: 100)
 * @returns ValidationResult
 */
export function validateName(
  name: string,
  minLength: number = 2,
  maxLength: number = 100
): ValidationResult {
  // Check for suspicious patterns BEFORE sanitizing (SQL injection, script tags)
  const suspiciousPatterns =
    /(<script|<\/script|select\s+\*|drop\s+table|union\s+select|insert\s+into|<[^>]*>)/i;
  if (suspiciousPatterns.test(name)) {
    return { isValid: false, error: "Invalid characters detected" };
  }

  const sanitized = sanitizeString(name);

  if (!sanitized) {
    return { isValid: false, error: "Name is required" };
  }

  if (sanitized.length < minLength) {
    return {
      isValid: false,
      error: `Name must be at least ${minLength} characters`,
    };
  }

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      error: `Name must be less than ${maxLength} characters`,
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates a message/text area content
 * @param message - Message string to validate
 * @param minLength - Minimum length (default: 10)
 * @param maxLength - Maximum length (default: 5000)
 * @returns ValidationResult
 */
export function validateMessage(
  message: string,
  minLength: number = 10,
  maxLength: number = 5000
): ValidationResult {
  const sanitized = sanitizeString(message);

  if (!sanitized) {
    return { isValid: false, error: "Message is required" };
  }

  if (sanitized.length < minLength) {
    return {
      isValid: false,
      error: `Message must be at least ${minLength} characters`,
    };
  }

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      error: `Message must be less than ${maxLength} characters`,
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates a URL
 * @param url - URL string to validate
 * @param allowedProtocols - Allowed protocols (default: https, http)
 * @returns ValidationResult
 */
export function validateUrl(
  url: string,
  allowedProtocols: string[] = ["https:", "http:"]
): ValidationResult {
  const sanitized = sanitizeString(url);

  if (!sanitized) {
    return { isValid: true, sanitized: "" }; // URLs are often optional
  }

  try {
    const parsedUrl = new URL(sanitized);

    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return { isValid: false, error: "URL must use HTTPS or HTTP protocol" };
    }

    // Block javascript: and data: URLs
    if (
      parsedUrl.protocol === "javascript:" ||
      parsedUrl.protocol === "data:"
    ) {
      return { isValid: false, error: "Invalid URL protocol" };
    }

    return { isValid: true, sanitized: parsedUrl.href };
  } catch {
    return { isValid: false, error: "Please enter a valid URL" };
  }
}

/**
 * Validates a subject line
 * @param subject - Subject string to validate
 * @returns ValidationResult
 */
export function validateSubject(subject: string): ValidationResult {
  const sanitized = sanitizeString(subject);

  if (!sanitized) {
    return { isValid: false, error: "Subject is required" };
  }

  if (sanitized.length < 3) {
    return { isValid: false, error: "Subject must be at least 3 characters" };
  }

  if (sanitized.length > 200) {
    return {
      isValid: false,
      error: "Subject must be less than 200 characters",
    };
  }

  return { isValid: true, sanitized };
}

// ============================================
// Form Validation
// ============================================

/**
 * Validates a contact form submission
 * @param data - Form data object
 * @returns Object with validation results for each field
 */
export function validateContactForm(data: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): {
  isValid: boolean;
  errors: FormValidationErrors;
  sanitized: typeof data;
} {
  const nameResult = validateName(data.name);
  const emailResult = validateEmail(data.email);
  const subjectResult = data.subject
    ? validateSubject(data.subject)
    : { isValid: true, sanitized: "" };
  const messageResult = validateMessage(data.message);

  const errors: FormValidationErrors = {};

  if (!nameResult.isValid) errors.name = nameResult.error;
  if (!emailResult.isValid) errors.email = emailResult.error;
  if (!subjectResult.isValid) errors.subject = subjectResult.error;
  if (!messageResult.isValid) errors.message = messageResult.error;

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitized: {
      name: nameResult.sanitized || "",
      email: emailResult.sanitized || "",
      subject: subjectResult.sanitized || "",
      message: messageResult.sanitized || "",
    },
  };
}

// ============================================
// Rate Limiting (Client-side)
// ============================================

const submissionTimestamps: Map<string, number[]> = new Map();

/**
 * Checks if a form submission should be rate limited
 * @param formId - Identifier for the form
 * @param maxSubmissions - Maximum submissions allowed
 * @param windowMs - Time window in milliseconds (default: 1 minute)
 * @returns Whether the submission should be blocked
 */
export function isRateLimited(
  formId: string,
  maxSubmissions: number = 3,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const timestamps = submissionTimestamps.get(formId) || [];

  // Filter out old timestamps
  const recentTimestamps = timestamps.filter((ts) => now - ts < windowMs);

  if (recentTimestamps.length >= maxSubmissions) {
    return true;
  }

  // Record this submission
  recentTimestamps.push(now);
  submissionTimestamps.set(formId, recentTimestamps);

  return false;
}

/**
 * Clears rate limit history for a form
 * @param formId - Identifier for the form
 */
export function clearRateLimit(formId: string): void {
  submissionTimestamps.delete(formId);
}
