// User-agent parsing for page views: device class, browser family and OS,
// plus a bot check. Regex only, no dependency. The UA string itself is never
// stored; only these coarse labels are.

const BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|axios|node-fetch|go-http/i;

/** True for crawlers, link previewers, scripts and a missing UA. */
function isBot(ua) {
  return typeof ua !== "string" || !ua.trim() || BOT.test(ua);
}

/** "tablet" | "mobile" | "desktop". iPadOS reports a Mac UA, so it counts as desktop. */
function deviceOf(ua) {
  if (/ipad|tablet|kindle|silk|android(?!.*mobile)/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

// Order matters: Edge, Opera and Samsung Internet all claim Chrome and Safari.
const BROWSERS = [
  ["edge", /edg(e|a|ios)?\//i],
  ["opera", /opr\/|opera/i],
  ["samsung", /samsungbrowser/i],
  ["firefox", /firefox|fxios/i],
  ["chrome", /chrome|crios|chromium/i],
  ["safari", /safari/i],
];

// iOS before macOS (iPhone UAs say "like Mac OS X"); Android before Linux.
const SYSTEMS = [
  ["ios", /iphone|ipad|ipod/i],
  ["android", /android/i],
  ["windows", /windows/i],
  ["macos", /mac os x|macintosh/i],
  ["linux", /linux|cros/i],
];

function firstMatch(table, ua) {
  const hit = table.find(([, re]) => re.test(ua));
  return hit ? hit[0] : "other";
}

/** { dev, br, os } for a UA string. */
function parseUserAgent(ua) {
  const s = typeof ua === "string" ? ua : "";
  return { dev: deviceOf(s), br: firstMatch(BROWSERS, s), os: firstMatch(SYSTEMS, s) };
}

module.exports = { isBot, parseUserAgent };
