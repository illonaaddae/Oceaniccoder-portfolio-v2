/**
 * Client-side Rate Limiting
 * @module utils/validation/rateLimit
 */

const submissionTimestamps: Map<string, number[]> = new Map();

/**
 * Checks if a form submission should be rate limited
 */
export function isRateLimited(
  formId: string,
  maxSubmissions = 3,
  windowMs = 60000,
): boolean {
  const now = Date.now();
  const timestamps = submissionTimestamps.get(formId) || [];
  const recentTimestamps = timestamps.filter((ts) => now - ts < windowMs);

  if (recentTimestamps.length >= maxSubmissions) {
    return true;
  }

  recentTimestamps.push(now);
  submissionTimestamps.set(formId, recentTimestamps);
  return false;
}

/**
 * Clears rate limit history for a form
 */
export function clearRateLimit(formId: string): void {
  submissionTimestamps.delete(formId);
}
