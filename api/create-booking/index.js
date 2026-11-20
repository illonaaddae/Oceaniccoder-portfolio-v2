/* global require, module, Buffer */
const https = require("https");
const querystring = require("querystring");
const {
  C,
  esc,
  multiline,
  shell,
  heading,
  p,
  card,
  button,
  buttons,
  notice,
  divider,
  small,
} = require("../shared/email/ui");
const cosmos = require("../shared/cosmos");
const { errorReason } = require("../shared/errors");
const { withDeadline } = require("../shared/deadline");
const turnstile = require("../shared/turnstile");
const { createRateLimiter } = require("../shared/rateLimit");
const { createCosmosLocks } = require("../shared/locks");
const { validateBooking, Invalid } = require("./validate");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BOOKINGS_PER_IP = 5;
const INVITES_PER_DAY = 20;

const MEETING_DURATIONS = { discovery: 30, project: 60, mentorship: 45, general: 30 };
const MEETING_LABELS = {
  discovery: "Discovery Call",
  project: "Project Discussion",
  mentorship: "Mentorship Session",
  general: "General Chat",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function httpsRequest(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === "string" ? body : JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method,
        headers: { ...headers, "Content-Length": Buffer.byteLength(data) },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: raw }));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function parseTime(timeStr) {
  const [time, period] = timeStr.split(" ");
  const [h, m] = time.split(":").map(Number);
  let hours = h;
  if (period === "PM" && h !== 12) hours += 12;
  if (period === "AM" && h === 12) hours = 0;
  return { hours, minutes: m };
}

function addMinutes(hours, minutes, duration) {
  const total = hours * 60 + minutes + duration;
  return { hours: Math.floor(total / 60) % 24, minutes: total % 60 };
}

function toDateTime(date, hours, minutes) {
  return `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Pull the Meet video URL out of an event resource (entryPoints preferred, hangoutLink fallback).
function extractMeetLink(ev) {
  const fromEntry =
    ev?.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
  return fromEntry || ev?.hangoutLink || null;
}

// Google Meet conference creation is async: the events.insert response often returns
// conferenceData.createRequest.status.statusCode === "pending" with no entryPoints yet.
// Re-fetch the event a few times until the Meet link is populated.
async function pollMeetLink(
  accessToken,
  calendarId,
  eventId,
  { attempts = 4, intervalMs = 800 } = {},
) {
  const path =
    `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}` +
    `?conferenceDataVersion=1`;
  for (let i = 0; i < attempts; i++) {
    await delay(intervalMs);
    const res = await httpsRequest(
      "www.googleapis.com",
      path,
      "GET",
      { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      "",
    );
    if (res.status !== 200) continue;
    const link = extractMeetLink(JSON.parse(res.body));
    if (link) return link;
  }
  return null;
}

async function getAccessToken() {
  const body = querystring.stringify({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const result = await httpsRequest(
    "oauth2.googleapis.com",
    "/token",
    "POST",
    { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  );
  const data = JSON.parse(result.body);
  if (!data.access_token) {
    const errCode = data.error || `http_${result.status}`;
    throw new Error(`oauth:${errCode}`);
  }
  return data.access_token;
}

async function getZoomToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) return null;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = `grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;
  const result = await httpsRequest(
    "zoom.us",
    "/oauth/token",
    "POST",
    { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  );
  const data = JSON.parse(result.body);
  if (!data.access_token) {
    const errCode = data.reason || data.error || `http_${result.status}`;
    throw new Error(`zoom_oauth:${errCode}`);
  }
  return data.access_token;
}

async function createZoomMeeting(
  token,
  { name, preferredDate, preferredTime, timezone, duration, label },
) {
  const { hours, minutes } = parseTime(preferredTime);
  const startTime = `${preferredDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  const meeting = {
    topic: `${label} with ${name}`,
    type: 2,
    start_time: startTime,
    duration,
    timezone: timezone || "UTC",
    settings: { host_video: true, participant_video: true, waiting_room: true },
  };
  const result = await httpsRequest(
    "api.zoom.us",
    "/v2/users/me/meetings",
    "POST",
    { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    meeting,
  );
  if (result.status !== 201) throw new Error(`zoom_api:${result.status}`);
  return JSON.parse(result.body).join_url ?? null;
}

// The browser gives up after 10 s. Bounding the check well inside that leaves
// time for the owner alert, which a hung query would never reach.
const SLOT_CHECK_TIMEOUT_MS = 5000;

// Same match as the bookings check in /api/submit. Rows saved there (or
// before the slot lock existed) have random ids, so the lock alone can't see them.
async function isSlotTaken(date, time) {
  const { resources } = await withDeadline(SLOT_CHECK_TIMEOUT_MS, (abortSignal) =>
    cosmos
      .getDatabase()
      .container("bookings")
      .items.query(
        {
          query:
            "SELECT TOP 1 c.id FROM c WHERE c.preferredDate = @date AND c.preferredTime = @time",
          parameters: [
            { name: "@date", value: date },
            { name: "@time", value: time },
          ],
        },
        { abortSignal },
      )
      .fetchAll(),
  );
  return resources.length > 0;
}

const CLIENT_REASON = "OceanicCoder · Web and app development";
const ADMIN_REASON = "Sent to you as the OceanicCoder admin.";

// Free-text block for the booker's message: a plain bordered block, so the
// text keeps its line breaks instead of sitting right-aligned in a table row.
function messageBlock(name, message) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:8px;margin:0 0 24px">
<tr><td style="padding:18px 22px">
<div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.ink3};margin:0 0 10px">Message from ${esc(name)}</div>
<div style="font-size:14px;line-height:1.6;color:${C.ink2}">${multiline(message)}</div>
</td></tr></table>`;
}

// safeUrl() only passes https links, so the reply link is built here. The
// address is escaped and only linked when it looks like an address.
function replyLink(name, email) {
  if (!/^[^\s@<>"']+@[^\s@<>"']+$/.test(String(email))) return "";
  return `<p style="margin:0 0 20px;font-size:14px"><a href="mailto:${esc(email)}" style="color:${C.tealDark};font-weight:600">Reply to ${esc(name)}</a></p>`;
}

function hostNotificationHtml({
  name,
  email,
  phone,
  label,
  duration,
  preferredDate,
  preferredTime,
  timezone,
  message,
  platform,
  joinLink,
  calendarEventLink,
  failureReason,
  alert,
}) {
  const when = `${preferredDate} at ${preferredTime}`;
  // `alert` replaces the default no-link notice for other failures.
  const actionNeeded = Boolean(alert || failureReason);
  const noticeText =
    alert?.notice ??
    `No meeting link was created\n${failureReason}\nSend this booker a link by hand, then check the Google credentials in Azure configuration.`;
  const links = [
    joinLink ? button({ href: joinLink, label: `Join ${platform} meeting` }) : "",
    calendarEventLink
      ? button({ href: calendarEventLink, label: "View in Google Calendar", variant: "secondary" })
      : "",
  ].filter(Boolean);
  return shell({
    preview: alert
      ? alert.subject
      : failureReason
        ? `No meeting link was created for ${name} on ${when}`
        : `${name} booked a ${label} on ${when}`,
    meta: { label: "Booking", number: preferredDate },
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: actionNeeded ? "Action needed" : "New booking",
        tone: actionNeeded ? "danger" : "info",
        title: `${label} with ${name}`,
      }) +
      // A booking with no meeting link is not obviously broken from the outside:
      // the visitor is told a link is coming within 24 hours, and nothing says
      // why one was never made. Say it here, where it will actually be read.
      (actionNeeded ? notice({ tone: "danger", text: noticeText }) : "") +
      card({
        title: "Booking details",
        highlightLabel: "Date & time",
        highlight: when,
        rows: [
          ["Name", name],
          ["Email", email],
          ["Phone", phone],
          ["Meeting type", `${label} (${duration} min)`],
          ["Timezone", timezone || "UTC"],
          ["Platform", platform],
        ],
      }) +
      (message ? messageBlock(name, message) : "") +
      (links.length ? buttons(...links) : "") +
      replyLink(name, email),
  });
}

function bookerConfirmationHtml({
  name,
  label,
  duration,
  preferredDate,
  preferredTime,
  timezone,
  platform,
  joinLink,
  calendarEventLink,
}) {
  const when = `${preferredDate} at ${preferredTime}`;
  return shell({
    preview: `${label} on ${when} (${timezone || "UTC"}). Your ${platform} link is inside.`,
    meta: { label: "Booking", number: preferredDate },
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Booking confirmed",
        tone: "ok",
        title: `Your ${platform} call is confirmed`,
        intro: `Hi ${name}, your booking with Illona Addae is confirmed.`,
      }) +
      card({
        title: "Meeting details",
        highlightLabel: "Date & time",
        highlight: when,
        rows: [
          ["Meeting", `${label} (${duration} min)`],
          ["Timezone", timezone || "UTC"],
          ["Platform", platform],
        ],
      }) +
      buttons(
        button({ href: joinLink, label: `Join ${platform}` }),
        calendarEventLink
          ? button({
              href: calendarEventLink,
              label: "Add to Google Calendar",
              variant: "secondary",
            })
          : "",
      ) +
      p("Save this link. You'll need it to join the call.") +
      divider() +
      small("Need to change the time? Reply to this email."),
  });
}

async function sendNotificationEmail(
  context,
  {
    name,
    email,
    phone,
    meetingType,
    preferredDate,
    preferredTime,
    timezone,
    message,
    meetLink,
    zoomLink,
    calendarEventLink,
    failureReason,
    alert,
  },
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    context.log.warn("RESEND_API_KEY not set — skipping host notification");
    return;
  }

  const toEmail = process.env.RESEND_TO_EMAIL || process.env.GOOGLE_CALENDAR_ID;
  if (!toEmail) {
    context.log.warn("RESEND_TO_EMAIL not set — skipping host notification");
    return;
  }

  const label = MEETING_LABELS[meetingType] ?? meetingType;
  const duration = MEETING_DURATIONS[meetingType] ?? 30;
  const joinLink = meetLink || zoomLink || null;
  const platform = zoomLink ? "Zoom" : "Google Meet";

  const html = hostNotificationHtml({
    name,
    email,
    phone,
    label,
    duration,
    preferredDate,
    preferredTime,
    timezone,
    message,
    platform,
    joinLink,
    calendarEventLink,
    failureReason,
    alert,
  });

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const result = await httpsRequest(
    "api.resend.com",
    "/emails",
    "POST",
    { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    {
      from: `OceanicCoder Bookings <${fromEmail}>`,
      to: [toEmail],
      subject: alert
        ? alert.subject
        : failureReason
          ? `Action needed: booking with ${name} on ${preferredDate} has no meeting link`
          : `New Booking: ${label} with ${name} on ${preferredDate} at ${preferredTime}`,
      html,
    },
  );

  if (result.status !== 200 && result.status !== 201) {
    context.log.error("Resend notification failed:", result.status, result.body);
  } else {
    context.log.info("Host notification sent to", toEmail);
  }
}

async function sendBookerZoomEmail(
  context,
  { name, email, meetingType, preferredDate, preferredTime, timezone, zoomLink },
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !zoomLink) return;

  const label = MEETING_LABELS[meetingType] ?? meetingType;
  const duration = MEETING_DURATIONS[meetingType] ?? 30;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const html = bookerConfirmationHtml({
    name,
    label,
    duration,
    preferredDate,
    preferredTime,
    timezone,
    platform: "Zoom",
    joinLink: zoomLink,
    calendarEventLink: null,
  });

  const result = await httpsRequest(
    "api.resend.com",
    "/emails",
    "POST",
    { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    {
      from: `Illona Addae (OceanicCoder) <${fromEmail}>`,
      to: [email],
      subject: `Your Zoom Meeting is Confirmed for ${preferredDate} at ${preferredTime}`,
      html,
    },
  );

  if (result.status !== 200 && result.status !== 201) {
    context.log.error("Booker Zoom email failed:", result.status, result.body);
  } else {
    context.log.info("Booker Zoom confirmation sent to", email);
  }
}

async function sendBookerMeetEmail(
  context,
  { name, email, meetingType, preferredDate, preferredTime, timezone, meetLink, calendarEventLink },
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !meetLink) return;

  const label = MEETING_LABELS[meetingType] ?? meetingType;
  const duration = MEETING_DURATIONS[meetingType] ?? 30;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const html = bookerConfirmationHtml({
    name,
    label,
    duration,
    preferredDate,
    preferredTime,
    timezone,
    platform: "Google Meet",
    joinLink: meetLink,
    calendarEventLink: calendarEventLink,
  });

  const result = await httpsRequest(
    "api.resend.com",
    "/emails",
    "POST",
    { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    {
      from: `Illona Addae (OceanicCoder) <${fromEmail}>`,
      to: [email],
      subject: `Your Google Meet is Confirmed for ${preferredDate} at ${preferredTime}`,
      html,
    },
  );

  if (result.status !== 200 && result.status !== 201) {
    context.log.error("Booker Meet email failed:", result.status, result.body);
  } else {
    context.log.info("Booker Meet confirmation sent to", email);
  }
}

// Creates the Zoom meeting or calendar event and sends the emails. Returns
// the links, or nulls and a `_phase` naming what failed.
async function sendInvites(context, booking) {
  const {
    name,
    email,
    meetingType,
    preferredDate,
    preferredTime,
    timezone,
    message,
    phone,
    preferredPlatform,
  } = booking;

  // ── Zoom path ────────────────────────────────────────────────────────────────
  if ((preferredPlatform || "google").toLowerCase() === "zoom") {
    const zoomConfigured =
      process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET;
    if (!zoomConfigured) {
      sendNotificationEmail(context, {
        name,
        email,
        phone,
        meetingType,
        preferredDate,
        preferredTime,
        timezone,
        message,
        meetLink: null,
        zoomLink: null,
        calendarEventLink: null,
        failureReason:
          "Zoom is not configured: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID or ZOOM_CLIENT_SECRET is missing in Azure configuration.",
      }).catch((e) => context.log.error("Notification error:", e.message));
      return {
        zoomLink: null,
        meetLink: null,
        calendarEventLink: null,
        _phase: "zoom_unconfigured",
      };
    }
    try {
      const zoomToken = await getZoomToken();
      const duration = MEETING_DURATIONS[meetingType] ?? 30;
      const label = MEETING_LABELS[meetingType] ?? meetingType;
      const zoomJoinUrl = await createZoomMeeting(zoomToken, {
        name,
        preferredDate,
        preferredTime,
        timezone,
        duration,
        label,
      });
      await Promise.allSettled([
        sendNotificationEmail(context, {
          name,
          email,
          phone,
          meetingType,
          preferredDate,
          preferredTime,
          timezone,
          message,
          meetLink: null,
          zoomLink: zoomJoinUrl,
          calendarEventLink: null,
        }).catch((e) => context.log.error("Notification error:", e.message)),
        sendBookerZoomEmail(context, {
          name,
          email,
          meetingType,
          preferredDate,
          preferredTime,
          timezone,
          zoomLink: zoomJoinUrl,
        }).catch((e) => context.log.error("Booker Zoom email error:", e.message)),
      ]);
      return {
        zoomLink: zoomJoinUrl,
        meetLink: null,
        calendarEventLink: null,
      };
    } catch (err) {
      const msg = String(err);
      context.log.error("zoom meeting error:", msg);
      sendNotificationEmail(context, {
        name,
        email,
        phone,
        meetingType,
        preferredDate,
        preferredTime,
        timezone,
        message,
        meetLink: null,
        zoomLink: null,
        calendarEventLink: null,
      }).catch((e) => context.log.error("Notification error:", e.message));
      return {
        zoomLink: null,
        meetLink: null,
        calendarEventLink: null,
        _phase: msg,
      };
    }
  }

  // ── Google Calendar path ──────────────────────────────────────────────────
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!process.env.GOOGLE_CLIENT_ID || !calendarId) {
    context.log.warn("Google creds not configured — skipping calendar event creation");
    sendNotificationEmail(context, {
      name,
      email,
      phone,
      meetingType,
      preferredDate,
      preferredTime,
      timezone,
      message,
      meetLink: null,
      zoomLink: null,
      calendarEventLink: null,
      failureReason:
        "Google Calendar is not configured: GOOGLE_CLIENT_ID or GOOGLE_CALENDAR_ID is missing in Azure configuration.",
    }).catch((e) => context.log.error("Notification error:", e.message));
    return {
      zoomLink: null,
      meetLink: null,
      calendarEventLink: null,
      _phase: "google_unconfigured",
    };
  }

  try {
    const accessToken = await getAccessToken();

    const { hours, minutes } = parseTime(preferredTime);
    const duration = MEETING_DURATIONS[meetingType] ?? 30;
    const end = addMinutes(hours, minutes, duration);
    const label = MEETING_LABELS[meetingType] ?? meetingType;

    // Google sends the event to the attendee, so it carries no free text from
    // the request. The phone number and message are in the owner's email.
    const description = [
      `Meeting Type: ${label} (${duration} min)`,
      "Booked via OceanicCoder Portfolio · oceaniccoder.dev",
    ].join("\n\n");

    const calEvent = {
      summary: `${label} with ${name}`,
      description,
      start: { dateTime: toDateTime(preferredDate, hours, minutes), timeZone: timezone || "UTC" },
      end: {
        dateTime: toDateTime(preferredDate, end.hours, end.minutes),
        timeZone: timezone || "UTC",
      },
      attendees: [
        { email, displayName: name },
        { email: calendarId, displayName: "Illona Addae (OceanicCoder)" },
      ],
      conferenceData: {
        createRequest: {
          requestId: `oc-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    const calPath =
      `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
      `?conferenceDataVersion=1&sendUpdates=all`;

    const calRes = await httpsRequest(
      "www.googleapis.com",
      calPath,
      "POST",
      { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      calEvent,
    );

    if (calRes.status !== 200) {
      context.log.error(`Calendar API error (HTTP ${calRes.status}):`, calRes.body);
      sendNotificationEmail(context, {
        name,
        email,
        phone,
        meetingType,
        preferredDate,
        preferredTime,
        timezone,
        message,
        meetLink: null,
        zoomLink: null,
        calendarEventLink: null,
        failureReason: `The Google Calendar API rejected the event (HTTP ${calRes.status}).`,
      }).catch((e) => context.log.error("Notification error:", e.message));
      return {
        zoomLink: null,
        meetLink: null,
        calendarEventLink: null,
        _phase: `calendar_api_${calRes.status}`,
      };
    }

    const ev = JSON.parse(calRes.body);
    let meetLink = extractMeetLink(ev);
    const calendarEventLink = ev.htmlLink ?? null;

    // Meet link is created asynchronously — if it's not ready in the insert response,
    // poll the event until Google populates the conference entry points.
    if (!meetLink && ev.id) {
      meetLink = await pollMeetLink(accessToken, calendarId, ev.id).catch((e) => {
        context.log.warn("Meet link poll failed:", e.message);
        return null;
      });
    }

    await Promise.allSettled([
      sendNotificationEmail(context, {
        name,
        email,
        phone,
        meetingType,
        preferredDate,
        preferredTime,
        timezone,
        message,
        meetLink,
        zoomLink: null,
        calendarEventLink,
      }).catch((e) => context.log.error("Notification error:", e.message)),
      sendBookerMeetEmail(context, {
        name,
        email,
        meetingType,
        preferredDate,
        preferredTime,
        timezone,
        meetLink,
        calendarEventLink,
      }).catch((e) => context.log.error("Booker Meet email error:", e.message)),
    ]);
    return { zoomLink: null, meetLink, calendarEventLink };
  } catch (err) {
    const msg = String(err);
    context.log.error("create-booking error:", msg);
    // invalid_grant means the refresh token in Azure has stopped working, which
    // silently disabled calendar invites for months the last time it happened.
    const failureReason = msg.includes("invalid_grant")
      ? "Google rejected the saved credentials (invalid_grant). GOOGLE_REFRESH_TOKEN in Azure configuration needs to be reissued; run scripts/get-google-refresh-token.mjs. Booking invites stay broken until it is replaced."
      : `The calendar step failed: ${msg}`;
    sendNotificationEmail(context, {
      name,
      email,
      phone,
      meetingType,
      preferredDate,
      preferredTime,
      timezone,
      message,
      meetLink: null,
      zoomLink: null,
      calendarEventLink: null,
      failureReason,
    }).catch((e) => context.log.error("Notification error:", e.message));
    return {
      zoomLink: null,
      meetLink: null,
      calendarEventLink: null,
      _phase: msg,
    };
  }
}

// Reserves the slot and saves the booking row before anything is sent. The
// lock makes the check-then-write atomic, so two requests for the same slot
// can't both pass the check. Returns the saved document, or null when the
// slot is taken or another request is booking it right now.
//
// A crash between take() and release() strands the lock and blocks that slot
// until the row is deleted from the `locks` container (see shared/locks.js).
async function reserveSlot(context, booking) {
  const db = cosmos.getDatabase();
  const locks = createCosmosLocks(db);
  const key = `booking-slot:${booking.preferredDate}:${booking.preferredTime}`;
  if (!(await locks.take(key))) return null;
  try {
    if (await isSlotTaken(booking.preferredDate, booking.preferredTime)) return null;
    const { resource } = await db.container("bookings").items.create(cosmos.newDocument(booking));
    return resource;
  } finally {
    await locks
      .release(key)
      .catch((e) => context.log.error("Slot lock release failed:", e.message));
  }
}

// Stores the meeting links on the row so the admin can resend them. The
// booking already stands, so a failure is logged and the row kept as it was.
async function saveLinks(context, doc, { meetLink, zoomLink, calendarEventLink }) {
  const links = {
    ...(meetLink ? { meetingLink: meetLink } : {}),
    ...(zoomLink ? { zoomLink } : {}),
    ...(calendarEventLink ? { calendarEventLink } : {}),
  };
  if (Object.keys(links).length === 0) return doc;
  try {
    const { resource } = await cosmos
      .getDatabase()
      .container("bookings")
      .item(doc.id, doc.id)
      .replace({ ...doc, ...links, updatedAt: new Date().toISOString() });
    return resource;
  } catch (err) {
    context.log.error(`Saving meeting links on booking ${doc.id} failed:`, errorReason(err));
    return doc;
  }
}

const reply = (context, status, body) => {
  context.res = { status, headers: CORS, body: JSON.stringify(body) };
};

// The only place a booking is made. Order matters: fields are validated and
// the per-IP limit checked before the single-use Turnstile token is spent,
// and the row is saved (holding the slot) before any calendar, Zoom or email
// call. Turnstile can be solved by paid captcha farms and every booking sends
// mail from the owner's accounts, so invites are also capped per instance:
// BOOKINGS_PER_IP an hour per client IP, then INVITES_PER_DAY in total. Over
// the daily cap the booking is still saved, without an invite or emails.
function createHandler({ now = Date.now } = {}) {
  const allowIp = createRateLimiter({ limit: BOOKINGS_PER_IP, windowMs: HOUR_MS });
  const allowInvite = createRateLimiter({ limit: INVITES_PER_DAY, windowMs: DAY_MS, maxKeys: 1 });
  const allowCapLog = createRateLimiter({ limit: 1, windowMs: HOUR_MS, maxKeys: 1 });

  return async function (context, req) {
    if (req.method === "OPTIONS") {
      context.res = { status: 204, headers: CORS, body: "" };
      return;
    }

    const { turnstileToken, ...fields } = req.body || {};
    let booking;
    try {
      booking = validateBooking(fields, now());
    } catch (err) {
      if (err instanceof Invalid) {
        reply(context, 400, { error: err.message });
        return;
      }
      throw err;
    }

    // Requests without a forwarded IP share one bucket rather than going unlimited.
    const ip = turnstile.clientIp(req);
    if (!allowIp(ip || "unknown", 1, now())) {
      reply(context, 429, {
        error: "Too many bookings from your network. Please try again later.",
      });
      return;
    }

    const spam = await turnstile.verifyTurnstile(turnstileToken, ip);
    if (!spam.ok) {
      reply(context, spam.status, { error: spam.error });
      return;
    }

    const { name, preferredDate, preferredTime } = booking;
    let saved;
    try {
      saved = await reserveSlot(context, booking);
    } catch (err) {
      const reason = errorReason(err);
      context.log.error("Booking save failed:", reason);
      // Nothing was saved or sent. Tell the owner, who can follow up.
      await sendNotificationEmail(context, {
        ...booking,
        meetLink: null,
        zoomLink: null,
        calendarEventLink: null,
        alert: {
          subject: `Action needed: booking with ${name} on ${preferredDate} at ${preferredTime} couldn't be saved`,
          notice: `The booking wasn't saved\nThe server couldn't reserve ${preferredTime} on ${preferredDate} (${reason}), so it saved nothing and sent no invite or confirmation. The visitor was asked to try again.\nIf no booking for this slot shows under Bookings in the dashboard, contact them to rebook.`,
        },
      }).catch((e) => context.log.error("Notification error:", e.message));
      reply(context, 503, { error: "booking_failed" });
      return;
    }
    if (!saved) {
      reply(context, 409, {
        error: "slot_taken",
        message: `${preferredTime} on ${preferredDate} is already booked. Please choose a different time.`,
      });
      return;
    }

    let links;
    if (allowInvite("all", 1, now())) {
      links = await sendInvites(context, booking);
      saved = await saveLinks(context, saved, links);
    } else {
      if (allowCapLog("cap", 1, now())) {
        context.log.warn(
          `create-booking: invite cap of ${INVITES_PER_DAY} a day reached; saving bookings without invites or emails`,
        );
      }
      links = { zoomLink: null, meetLink: null, calendarEventLink: null, _phase: "invite_cap" };
    }
    reply(context, 200, { success: true, booking: cosmos.fromCosmos(saved), ...links });
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
// Exported for the admin email previews (api/shared/email/catalog.js).
module.exports.hostNotificationHtml = hostNotificationHtml;
module.exports.bookerConfirmationHtml = bookerConfirmationHtml;
