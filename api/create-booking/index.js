const https = require("https");
const querystring = require("querystring");

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
    // Expose error code only (not secrets) so _phase is diagnostic
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

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const APPWRITE_BOOKINGS_COLLECTION = "bookings";

async function isSlotTaken(date, time) {
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) return false; // skip check if key not configured

  const q1 = encodeURIComponent(
    JSON.stringify({ method: "equal", attribute: "preferredDate", values: [date] }),
  );
  const q2 = encodeURIComponent(
    JSON.stringify({ method: "equal", attribute: "preferredTime", values: [time] }),
  );
  const path = `/v1/databases/${APPWRITE_DATABASE_ID}/collections/${APPWRITE_BOOKINGS_COLLECTION}/documents?queries[]=${q1}&queries[]=${q2}&limit=1`;

  const url = new URL(APPWRITE_ENDPOINT);
  const res = await httpsRequest(
    url.hostname,
    path,
    "GET",
    {
      "X-Appwrite-Project": APPWRITE_PROJECT_ID,
      "X-Appwrite-Key": apiKey,
      "Content-Type": "application/json",
    },
    "",
  );

  if (res.status !== 200) return false;
  const data = JSON.parse(res.body);
  return (data.total ?? 0) > 0;
}

const ok = (context, body) => {
  context.res = { status: 200, headers: CORS, body: JSON.stringify(body) };
};

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

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
  } = req.body || {};

  if (!name || !email || !meetingType || !preferredDate || !preferredTime) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
    return;
  }

  // Server-side double-booking guard — guests can't query Appwrite directly
  try {
    const taken = await isSlotTaken(preferredDate, preferredTime);
    if (taken) {
      context.res = {
        status: 409,
        headers: CORS,
        body: JSON.stringify({
          error: "slot_taken",
          message: `${preferredTime} on ${preferredDate} is already booked. Please choose a different time.`,
        }),
      };
      return;
    }
  } catch (err) {
    context.log.warn("Slot check failed (non-fatal):", err.message);
  }

  // ── Zoom path ────────────────────────────────────────────────────────────────
  if ((preferredPlatform || "google").toLowerCase() === "zoom") {
    const zoomConfigured =
      process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET;
    if (!zoomConfigured) {
      ok(context, {
        success: true,
        zoomLink: null,
        meetLink: null,
        calendarEventLink: null,
        _phase: "zoom_unconfigured",
      });
      return;
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
      ok(context, {
        success: true,
        zoomLink: zoomJoinUrl,
        meetLink: null,
        calendarEventLink: null,
      });
    } catch (err) {
      const msg = String(err);
      context.log.error("zoom meeting error:", msg);
      ok(context, {
        success: true,
        zoomLink: null,
        meetLink: null,
        calendarEventLink: null,
        _phase: msg,
      });
    }
    return;
  }

  // ── Google Calendar path ──────────────────────────────────────────────────
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!process.env.GOOGLE_CLIENT_ID || !calendarId) {
    context.log.warn("Google creds not configured — skipping calendar event creation");
    ok(context, {
      success: true,
      zoomLink: null,
      meetLink: null,
      calendarEventLink: null,
      _phase: "google_unconfigured",
    });
    return;
  }

  try {
    const accessToken = await getAccessToken();

    const { hours, minutes } = parseTime(preferredTime);
    const duration = MEETING_DURATIONS[meetingType] ?? 30;
    const end = addMinutes(hours, minutes, duration);
    const label = MEETING_LABELS[meetingType] ?? meetingType;

    const description = [
      `Meeting Type: ${label} (${duration} min)`,
      phone ? `Phone: ${phone}` : "",
      message ? `\nMessage from ${name}:\n${message}` : "",
      "\nBooked via OceanicCoder Portfolio · oceaniccoder.com",
    ]
      .filter(Boolean)
      .join("\n");

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
      ok(context, {
        success: true,
        zoomLink: null,
        meetLink: null,
        calendarEventLink: null,
        _phase: `calendar_api_${calRes.status}`,
      });
      return;
    }

    const ev = JSON.parse(calRes.body);
    const meetLink =
      ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
    const calendarEventLink = ev.htmlLink ?? null;

    ok(context, { success: true, zoomLink: null, meetLink, calendarEventLink });
  } catch (err) {
    const msg = String(err);
    context.log.error("create-booking error:", msg);
    ok(context, {
      success: true,
      zoomLink: null,
      meetLink: null,
      calendarEventLink: null,
      _phase: msg,
    });
  }
};
