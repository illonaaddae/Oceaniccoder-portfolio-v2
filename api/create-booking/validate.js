/* global require, module */
// What a visitor may send to /api/create-booking. The fields go into a
// calendar invite and a confirmation email sent to `email`, so each one is
// held to what the booking form can actually produce. No Cosmos or network
// calls here.

const { Invalid, validateSubmission } = require("../shared/submissions");

const MEETING_TYPES = ["discovery", "project", "mentorship", "general"];
const PLATFORMS = ["google", "zoom"];
// Same slots as /api/get-availability and the booking form.
const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
];
const MAX_DAYS_AHEAD = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

// One plain ASCII address: no display name, no list, no quoted local part.
const EMAIL =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
// The name is the invite title and the email greeting, so it can't carry a
// link or an address.
const LINK_LIKE = /\/\/|www\.|@|\.(?:com|net|org|io|dev|xyz|info|biz|app|link|ly|co|me|ru|top)\b/i;
// Set by this function after the invite exists, never by the browser.
const SERVER_FIELDS = ["meetingLink", "zoomLink", "calendarEventLink"];

function isRealDate(value) {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the booking row to store, or throws Invalid with a message safe to
 * show the visitor. `nowMs` bounds the date: from yesterday (UTC, so every
 * timezone's "tomorrow" passes) to a year ahead.
 */
function validateBooking(body, nowMs = Date.now()) {
  if (body && typeof body === "object") {
    for (const name of SERVER_FIELDS) {
      if (Object.hasOwn(body, name)) throw new Invalid(`Unexpected field: ${name}`);
    }
  }
  const doc = validateSubmission("bookings", body);

  if (!EMAIL.test(doc.email)) throw new Invalid("email is invalid");
  if (LINK_LIKE.test(doc.name)) throw new Invalid("name can't contain a link or an email address");
  if (!MEETING_TYPES.includes(doc.meetingType)) throw new Invalid("meetingType is invalid");
  if (!TIME_SLOTS.includes(doc.preferredTime)) throw new Invalid("preferredTime is invalid");
  if (!isTimeZone(doc.timezone)) throw new Invalid("timezone is invalid");
  const platform = (doc.preferredPlatform || "google").toLowerCase();
  if (!PLATFORMS.includes(platform)) throw new Invalid("preferredPlatform is invalid");
  doc.preferredPlatform = platform;

  if (!isRealDate(doc.preferredDate)) throw new Invalid("preferredDate is invalid");
  const dayMs = Date.parse(`${doc.preferredDate}T00:00:00Z`);
  const todayMs = Date.parse(`${new Date(nowMs).toISOString().slice(0, 10)}T00:00:00Z`);
  if (dayMs < todayMs - DAY_MS || dayMs > todayMs + MAX_DAYS_AHEAD * DAY_MS) {
    throw new Invalid("preferredDate is out of range");
  }
  return doc;
}

module.exports = { validateBooking, Invalid, TIME_SLOTS, MEETING_TYPES };
