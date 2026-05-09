/**
 * Sanitization Functions
 * @module utils/validation/sanitize
 */

/**
 * Sanitizes a string by removing potentially dangerous HTML/script content
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";

  return input
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/\0/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Escapes HTML entities to prevent XSS
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
