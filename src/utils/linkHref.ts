/**
 * Link URL handling for markdown content.
 *
 * Markdown written in the admin editor reaches the renderer with hrefs that are
 * not always usable. The two that actually bit us:
 *
 *   1. `[https://example.com](url)` — the URL was pasted over the *text* slot
 *      and the toolbar's `url` placeholder stayed in the href. A browser reads
 *      `url` as a same-site path, so the link left the post, hit the SPA router
 *      and rendered "Page not found".
 *   2. `[Example](example.com)` — a bare domain is also a relative path, with
 *      the same result.
 *
 * These helpers repair both at render time, so posts already published do not
 * have to be edited, and feed the editor so new links are written correctly.
 */

/** Schemes we are willing to emit as an href. */
const SAFE_SCHEME = /^(?:https?:|mailto:|tel:)/i;

/** A domain-looking string: at least one dot, a plausible TLD, optional path. */
const BARE_DOMAIN = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}(?:[/?#][^\s]*)?$/i;

/** An absolute URL sitting inside a longer string. */
const URL_IN_TEXT = /https?:\/\/[^\s<>()[\]"']+/i;

/** Punctuation that ends a sentence rather than the URL it follows. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

/** True when a string is meant to be a link target rather than plain words. */
export function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return SAFE_SCHEME.test(trimmed) || BARE_DOMAIN.test(trimmed);
}

/** The first absolute URL in a block of text, with prose punctuation trimmed. */
export function firstUrlIn(text: string): string | null {
  const match = URL_IN_TEXT.exec(text || "");
  if (!match) return null;
  const url = match[0].replace(TRAILING_PUNCTUATION, "");
  return url || null;
}

/** Give a scheme-less but domain-shaped target the https it is missing. */
export function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (SAFE_SCHEME.test(trimmed)) return trimmed;
  if (BARE_DOMAIN.test(trimmed)) return `https://${trimmed}`;
  return null;
}

/**
 * Work out what a markdown link should actually point at.
 *
 * Returns null when there is nothing usable — the renderer then shows the text
 * without a link rather than shipping one that lands on a 404.
 */
export function resolveHref(href: string | undefined, text: string): string | null {
  const trimmed = (href || "").trim();

  // In-page anchors and root-relative routes are deliberate internal links.
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;

  const direct = normalizeUrl(trimmed);
  if (direct) return direct;

  // Broken or placeholder href — the URL is usually in the link text instead.
  return firstUrlIn(text || "");
}

/** True when the href leaves the site and so wants target/rel and an icon. */
export function isExternalHref(href: string | null | undefined): boolean {
  return /^https?:\/\//i.test((href || "").trim());
}

const MAX_LABEL = 60;

/**
 * Tidy a link label that is itself a raw URL.
 *
 * Pasting a URL as the link text is normal, but the scheme, the `www.` and a
 * trailing slash are noise, and a long one overflows on a phone.
 */
export function prettyUrlLabel(text: string): string {
  const trimmed = (text || "").trim();
  if (!looksLikeUrl(trimmed) || !/^https?:\/\//i.test(trimmed)) return text;

  const stripped = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");

  return stripped.length > MAX_LABEL ? `${stripped.slice(0, MAX_LABEL - 1)}…` : stripped;
}
