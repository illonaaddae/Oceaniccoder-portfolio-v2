/**
 * Credential IDs come in two shapes: human labels the issuer prints on the
 * certificate ("Professional Certificate", "Cloud Certification") and opaque
 * machine IDs (UUIDs, hashes, Credly badge ids). Only the second kind needs
 * shortening — a full UUID blows out the card's meta row and reads as noise.
 */

const OPAQUE_MIN_LENGTH = 14;

/** True when the value looks like a machine-generated identifier, not a label. */
export function isOpaqueCredentialId(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < OPAQUE_MIN_LENGTH) return false;
  // Any whitespace means it reads as words, so leave it alone.
  return !/\s/.test(trimmed);
}

/**
 * Middle-truncate an opaque ID so both ends stay recognisable — the head
 * identifies it at a glance, the tail is what people compare when verifying.
 * Human labels are returned untouched.
 */
export function formatCredentialId(value: string, head = 8, tail = 6): string {
  const trimmed = value.trim();
  if (!isOpaqueCredentialId(trimmed)) return trimmed;
  if (trimmed.length <= head + tail + 1) return trimmed;
  return `${trimmed.slice(0, head)}…${trimmed.slice(-tail)}`;
}
