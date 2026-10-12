/**
 * First-party page-view tracker. Sends page views, a few interaction events
 * and time-on-page to /api/visit with sendBeacon (fetch keepalive as the
 * fallback). No cookies and no third parties.
 *
 * A session is a random id in sessionStorage (`oc_sid`) that rolls over after
 * 30 minutes without a page view (`oc_last`). When storage is blocked the id
 * lives in memory for the life of the page. Visitors are counted server-side
 * from a daily salted hash, so nothing here identifies a person.
 *
 * Every export is fire-and-forget and never throws: analytics must not be able
 * to break a page.
 */

import { apiUrl } from "../apiUrl";
import { trackingAllowed } from "./consent";
import { normalisePath } from "./routes";
import { classify, externalReferrerHost, parseUtm, type Channel, type Utm } from "./channel";

const ENDPOINT = "/api/visit";
const SID_KEY = "oc_sid";
const LAST_KEY = "oc_last";
const IDLE_MS = 30 * 60 * 1000;
const MAX_MS = 30 * 60 * 1000;
const SID = /^s_[A-Za-z0-9_-]{16,32}$/;
const LANG = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
const SID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

interface PageViewEvent {
  t: "pv";
  path: string;
  entry?: true;
  ref?: string;
  utm?: Utm;
  ch?: Channel;
  prevMs?: number;
}
interface InteractionEvent {
  t: "ev";
  name: string;
  prop?: string;
  path: string;
}
interface LeaveEvent {
  t: "leave";
  path: string;
  ms: number;
}
type VisitEvent = PageViewEvent | InteractionEvent | LeaveEvent;

interface StoredSession {
  sid: string;
  last: number;
}

let memorySession: StoredSession | null = null;
let current: { path: string; start: number; sid: string } | null = null;
let leaveSent = false;
let firstViewOfLoad = true;
let listening = false;

const clampMs = (ms: number) => Math.min(MAX_MS, Math.max(0, Math.round(ms)));

function newSid(): string {
  const bytes = new Uint8Array(22);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `s_${Array.from(bytes, (b) => SID_ALPHABET[b & 63]).join("")}`;
}

function loadSession(): StoredSession | null {
  try {
    const sid = sessionStorage.getItem(SID_KEY);
    if (sid) return { sid, last: Number(sessionStorage.getItem(LAST_KEY)) || 0 };
  } catch {
    // Storage blocked: fall back to the in-memory session.
  }
  return memorySession;
}

function saveSession(session: StoredSession): void {
  memorySession = session;
  try {
    sessionStorage.setItem(SID_KEY, session.sid);
    sessionStorage.setItem(LAST_KEY, String(session.last));
  } catch {
    // Storage blocked or full; the in-memory copy carries on.
  }
}

/** The current session id, starting a new one after 30 minutes idle. */
function touchSession(now: number): { sid: string; isNew: boolean } {
  const stored = loadSession();
  const live =
    stored !== null && SID.test(stored.sid) && now >= stored.last && now - stored.last < IDLE_MS;
  const sid = live ? stored.sid : newSid();
  saveSession({ sid, last: now });
  return { sid, isNew: !live };
}

function timeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === "string" && zone.length <= 64 ? zone : undefined;
  } catch {
    return undefined;
  }
}

function language(): string | undefined {
  const lang = typeof navigator.language === "string" ? navigator.language : "";
  if (LANG.test(lang)) return lang;
  const primary = lang.split("-")[0].toLowerCase();
  return /^[a-z]{2,3}$/.test(primary) ? primary : undefined;
}

function send(sid: string, events: VisitEvent[]): void {
  const body = JSON.stringify({ v: 1, sid, tz: timeZone(), lang: language(), events });
  const url = apiUrl(ENDPOINT);
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(url, blob)) return;
  } catch {
    // Some browsers refuse a JSON beacon; fetch below covers them.
  }
  try {
    fetch(url, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      credentials: "omit",
    }).catch(() => undefined);
  } catch {
    // No way to send; a lost page view is acceptable.
  }
}

function onPageHide(): void {
  try {
    if (!current || leaveSent || !trackingAllowed()) return;
    leaveSent = true;
    send(current.sid, [
      { t: "leave", path: current.path, ms: clampMs(Date.now() - current.start) },
    ]);
  } catch {
    // Never break unload.
  }
}

// A page restored from the back/forward cache starts timing again.
function onPageShow(event: Event): void {
  if ((event as Event & { persisted?: boolean }).persisted && current) {
    current = { ...current, start: Date.now() };
    leaveSent = false;
  }
}

function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
}

/** Records a view of `pathname`. `search` is read for UTM tags on a session's first view. */
export function trackPageView(pathname: string, search = ""): void {
  try {
    if (!trackingAllowed()) return;
    listen();
    const path = normalisePath(pathname);
    if (!path) {
      // Excluded page: send nothing, and don't count its time on the next view.
      current = null;
      firstViewOfLoad = false;
      return;
    }
    const now = Date.now();
    const { sid, isNew } = touchSession(now);
    const event: PageViewEvent = { t: "pv", path };
    if (current && current.sid === sid) event.prevMs = clampMs(now - current.start);
    if (isNew) {
      // The referrer only describes how this page load began.
      const refHost = firstViewOfLoad
        ? externalReferrerHost(document.referrer, window.location.hostname)
        : null;
      const utm = parseUtm(search);
      event.entry = true;
      if (refHost) event.ref = refHost;
      if (utm) event.utm = utm;
      event.ch = classify({ refHost, utm });
    }
    firstViewOfLoad = false;
    current = { path, start: now, sid };
    leaveSent = false;
    send(sid, [event]);
  } catch {
    // Analytics must never break navigation.
  }
}

/** Records an interaction on the current page (allow-listed server-side). */
export function trackEvent(name: string, prop?: string): void {
  try {
    if (!current || !trackingAllowed()) return;
    const { sid } = touchSession(Date.now());
    send(sid, [{ t: "ev", name, ...(prop ? { prop } : {}), path: current.path }]);
  } catch {
    // Never break the caller.
  }
}
