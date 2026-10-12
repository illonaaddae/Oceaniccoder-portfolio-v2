/**
 * Where a session came from: the external referrer host, the UTM tags on the
 * landing URL, and the channel they add up to. Used for the first page view of
 * a session; /api/visit only checks the channel against the enum.
 */

export type Channel = "direct" | "search" | "social" | "email" | "paid" | "referral";

export interface Utm {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
}

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
const MAX_VALUE = 100;
const HOST = /^(?=.{1,100}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;
// eslint-disable-next-line no-control-regex -- strips control characters on purpose
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

const PAID_MEDIUMS = new Set(["cpc", "ppc", "paid"]);
const EMAIL_MEDIUMS = new Set(["email", "newsletter"]);
const SOCIAL_MEDIUMS = new Set(["social", "social-media"]);
const SOCIAL_HOSTS = [
  "linkedin.com",
  "lnkd.in",
  "t.co",
  "x.com",
  "twitter.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "reddit.com",
  "wa.me",
  "whatsapp.com",
];
const SOCIAL_SOURCES = new Set([
  "linkedin",
  "twitter",
  "x",
  "facebook",
  "instagram",
  "youtube",
  "reddit",
  "whatsapp",
]);
// Webmail sits on search-engine domains (mail.google.com), so it is checked first.
const EMAIL_HOSTS = ["mail.google.com", "mail.yahoo.com", "outlook.live.com", "outlook.office.com"];
const SEARCH_HOSTS = ["bing.com", "duckduckgo.com", "ecosia.org", "baidu.com"];
const SEARCH_PATTERN = /(^|\.)(google|yahoo)\.[a-z.]+$/;

const onDomain = (host: string, domains: string[]) =>
  domains.some((d) => host === d || host.endsWith(`.${d}`));

const sameSite = (a: string, b: string) => a.replace(/^www\./, "") === b.replace(/^www\./, "");

/**
 * The referrer's hostname when it is another site, else null. Only http(s)
 * referrers count; app referrers (android-app://...) are treated as direct.
 */
export function externalReferrerHost(referrer: string, ownHost: string): string | null {
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (!HOST.test(host) || sameSite(host, ownHost.toLowerCase())) return null;
    return host;
  } catch {
    return null;
  }
}

/** The UTM tags from a query string, trimmed and lowercased; null when none. */
export function parseUtm(search: string): Utm | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  const utm: Utm = { source: null, medium: null, campaign: null, term: null, content: null };
  let found = false;
  for (const key of UTM_KEYS) {
    const value = (params.get(`utm_${key}`) || "")
      .replace(CONTROL_CHARS, "")
      .trim()
      .toLowerCase()
      .slice(0, MAX_VALUE);
    if (value) {
      utm[key] = value;
      found = true;
    }
  }
  return found ? utm : null;
}

export function classify({ refHost, utm }: { refHost: string | null; utm: Utm | null }): Channel {
  const medium = utm?.medium ?? "";
  if (PAID_MEDIUMS.has(medium)) return "paid";
  if (EMAIL_MEDIUMS.has(medium)) return "email";
  if (SOCIAL_MEDIUMS.has(medium) || SOCIAL_SOURCES.has(utm?.source ?? "")) return "social";
  if (refHost) {
    if (onDomain(refHost, SOCIAL_HOSTS)) return "social";
    if (onDomain(refHost, EMAIL_HOSTS)) return "email";
    if (onDomain(refHost, SEARCH_HOSTS) || SEARCH_PATTERN.test(refHost)) return "search";
    return "referral";
  }
  return "direct";
}
