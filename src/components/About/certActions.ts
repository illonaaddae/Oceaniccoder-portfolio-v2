import type { Certification } from "../../types";

export interface CertAction {
  /** Where the link points. */
  href: string;
  /** Whether the browser should download rather than navigate. */
  download: boolean;
}

/**
 * The uploaded certificate file is the real artefact, so it wins over the
 * manually pasted download URL when both exist. Returns null when there is
 * nothing to link to, so the card can hide the button rather than render an
 * anchor with no href (which is what it used to do).
 */
export function getDownloadAction(cert: Certification): CertAction | null {
  const file = cert.image?.trim();
  if (file) return { href: file, download: true };

  const link = cert.downloadLink?.trim();
  if (link) return { href: link, download: true };

  return null;
}

/** Opening the uploaded file in a tab, for a look before downloading. */
export function getPreviewHref(cert: Certification): string | null {
  return cert.image?.trim() || null;
}

export function getVerifyHref(cert: Certification): string | null {
  return cert.verifyLink?.trim() || null;
}
