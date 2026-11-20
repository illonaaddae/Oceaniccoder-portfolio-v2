// The meeting times the public booking form offers, and the one record that
// holds each slot. Used by /api/submit (which saves the row) and
// /api/create-booking (which sends the invite first).
//
// A booking's Cosmos id is derived from its date and 24-hour time, so the
// `bookings` container (partitioned by /id) refuses a second row for the same
// slot with 409, even when two requests race. Deleting the booking frees the
// slot; a cancelled booking still holds it, as before.
//
// TIME_SLOTS matches BookingSection.jsx and get-availability; change all three
// together.

const crypto = require("crypto");

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

// How far ahead a visitor may book, in days from today (UTC).
const BOOKING_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const TIME = /^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?$/i;

/** "10:00 am", "10:00AM" or "10:00" → "10:00" (24-hour), or null. */
function to24h(text) {
  const m = TIME.exec(String(text).trim());
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const period = m[3] && m[3][0].toLowerCase();
  if (minutes > 59) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === "p" && hours !== 12) hours += 12;
    if (period === "a" && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const SLOT_BY_24H = new Map(TIME_SLOTS.map((label) => [to24h(label), label]));

/** The offered label for any spelling of an offered time ("10:00 am" → "10:00 AM"), or null. */
function canonicalTime(text) {
  const time = to24h(text);
  return (time && SLOT_BY_24H.get(time)) || null;
}

/** True when `date` (YYYY-MM-DD) is a real day from today to BOOKING_WINDOW_DAYS ahead, in UTC. */
function isBookableDate(date, nowMs) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const dayMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (new Date(dayMs).toISOString().slice(0, 10) !== date) return false;
  const today = Math.floor(nowMs / DAY_MS) * DAY_MS;
  return dayMs >= today && dayMs <= today + BOOKING_WINDOW_DAYS * DAY_MS;
}

/** The booking id for a slot; `time` must be an offered label (canonicalTime). */
function bookingIdFor(date, time) {
  const key = `${date}T${to24h(time)}`;
  return `bk_${crypto.createHash("sha256").update(key).digest("hex").slice(0, 40)}`;
}

module.exports = { TIME_SLOTS, BOOKING_WINDOW_DAYS, canonicalTime, isBookableDate, bookingIdFor };
