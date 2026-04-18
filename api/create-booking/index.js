const MEETING_DURATIONS = { discovery: 30, project: 60, mentorship: 45, general: 30 };
const MEETING_LABELS = {
  discovery: "Discovery Call",
  project: "Project Discussion",
  mentorship: "Mentorship Session",
  general: "General Chat",
};

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
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }).toString(),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

module.exports = async function (context, req) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }, body: "" };
    return;
  }

  const { name, email, meetingType, preferredDate, preferredTime, timezone, message, phone } = req.body || {};

  if (!name || !email || !meetingType || !preferredDate || !preferredTime) {
    context.res = { status: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
    return;
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!process.env.GOOGLE_CLIENT_ID || !calendarId) {
    context.res = { status: 200, headers, body: JSON.stringify({ success: true, meetLink: null, calendarEventLink: null }) };
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
    ].filter(Boolean).join("\n");

    const event = {
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

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      },
    );

    if (!calRes.ok) {
      context.log.error("Calendar API error:", await calRes.text());
      context.res = { status: 200, headers, body: JSON.stringify({ success: true, meetLink: null, calendarEventLink: null }) };
      return;
    }

    const ev = await calRes.json();
    const meetLink = ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
    const calendarEventLink = ev.htmlLink ?? null;

    context.res = { status: 200, headers, body: JSON.stringify({ success: true, meetLink, calendarEventLink }) };
  } catch (err) {
    context.log.error("create-booking error:", err);
    context.res = { status: 200, headers, body: JSON.stringify({ success: true, meetLink: null, calendarEventLink: null }) };
  }
};
