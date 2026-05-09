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
      { hostname, path, method, headers: { ...headers, "Content-Length": Buffer.byteLength(data) } },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => { raw += chunk; });
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
  if (!data.access_token) throw new Error(`Token error: ${result.body}`);
  return data.access_token;
}

const ok = (context, body) => {
  context.res = { status: 200, headers: CORS, body: JSON.stringify(body) };
};

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  const { name, email, meetingType, preferredDate, preferredTime, timezone, message, phone } =
    req.body || {};

  if (!name || !email || !meetingType || !preferredDate || !preferredTime) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
    return;
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!process.env.GOOGLE_CLIENT_ID || !calendarId) {
    ok(context, { success: true, meetLink: null, calendarEventLink: null });
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
      end: { dateTime: toDateTime(preferredDate, end.hours, end.minutes), timeZone: timezone || "UTC" },
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
      context.log.error("Calendar API error:", calRes.body);
      ok(context, { success: true, meetLink: null, calendarEventLink: null });
      return;
    }

    const ev = JSON.parse(calRes.body);
    const meetLink =
      ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
    const calendarEventLink = ev.htmlLink ?? null;

    ok(context, { success: true, meetLink, calendarEventLink });
  } catch (err) {
    context.log.error("create-booking error:", err);
    ok(context, { success: true, meetLink: null, calendarEventLink: null });
  }
};
