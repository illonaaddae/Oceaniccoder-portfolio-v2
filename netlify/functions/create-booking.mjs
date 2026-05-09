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

async function sendNotificationEmail({ name, email, phone, meetingType, preferredDate, preferredTime, timezone, message, meetLink, label }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const adminEmail = process.env.GOOGLE_CALENDAR_ID || "addaeillona@gmail.com";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "OceanicCoder Bookings <onboarding@resend.dev>",
      to: adminEmail,
      subject: `New Booking: ${label} with ${name}`,
      html: `
        <h2 style="color:#0ea5e9">New Booking Request</h2>
        <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
          <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${name}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${phone}</td></tr>` : ""}
          <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold">Meeting Type</td><td style="padding:8px">${label}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Date & Time</td><td style="padding:8px">${preferredDate} at ${preferredTime}</td></tr>
          ${timezone ? `<tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold">Timezone</td><td style="padding:8px">${timezone}</td></tr>` : ""}
          ${message ? `<tr><td style="padding:8px;font-weight:bold">Message</td><td style="padding:8px">${message}</td></tr>` : ""}
          ${meetLink ? `<tr style="background:#f0fdf4"><td style="padding:8px;font-weight:bold">Meet Link</td><td style="padding:8px"><a href="${meetLink}">${meetLink}</a></td></tr>` : ""}
        </table>
        <p style="margin-top:16px;color:#64748b;font-size:12px">View all bookings in your <a href="https://oceaniccoder.com/admin">admin dashboard</a></p>
      `,
    }),
  }).catch((e) => console.warn("Email send failed:", e.message));
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
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error("[create-booking] OAuth token error:", JSON.stringify(data));
    throw new Error(`Token error: ${data.error} — ${data.error_description || ""}`);
  }
  return data.access_token;
}

/** Convert a local datetime (date string + hours + minutes) in a given IANA timezone to a UTC ISO string. */
function localToUTCISO(dateStr, hours, minutes, tz) {
  const naive = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  // Treat naive as UTC temporarily, then measure the tz offset at that instant
  const asUTC = new Date(naive + "Z");
  const formatted = asUTC.toLocaleString("en-CA", {
    timeZone: tz || "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }); // e.g. "2025-04-18, 13:00:00"
  const localParsed = new Date(formatted.replace(", ", "T") + "Z");
  const offset = asUTC.getTime() - localParsed.getTime(); // tz offset in ms
  return new Date(asUTC.getTime() + offset).toISOString();
}

/** Returns true if the slot is already busy on Google Calendar. Fails open (returns false) on any error. */
async function isSlotBusy(accessToken, calendarId, preferredDate, hours, minutes, duration, tz) {
  try {
    const startISO = localToUTCISO(preferredDate, hours, minutes, tz);
    const endISO = new Date(new Date(startISO).getTime() + duration * 60 * 1000).toISOString();
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin: startISO, timeMax: endISO, items: [{ id: calendarId }] }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return (data.calendars?.[calendarId]?.busy ?? []).length > 0;
  } catch {
    return false; // fail open — don't block booking on check error
  }
}

const conflict = (message) => ({
  statusCode: 409,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify({ error: "slot_taken", message }),
});

const ok = (body) => ({
  statusCode: 200,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { name, email, meetingType, preferredDate, preferredTime, timezone, message, phone } = body;

  if (!name || !email || !meetingType || !preferredDate || !preferredTime) {
    return {
      statusCode: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!process.env.GOOGLE_CLIENT_ID || !calendarId) {
    return ok({ success: true, meetLink: null, calendarEventLink: null });
  }

  console.log("[create-booking] Starting for", name, preferredDate, preferredTime, timezone);

  try {
    const accessToken = await getAccessToken();

    const { hours, minutes } = parseTime(preferredTime);
    const duration = MEETING_DURATIONS[meetingType] ?? 30;
    const end = addMinutes(hours, minutes, duration);
    const label = MEETING_LABELS[meetingType] ?? meetingType;

    const busy = await isSlotBusy(accessToken, calendarId, preferredDate, hours, minutes, duration, timezone);
    if (busy) {
      return conflict(
        `${preferredTime} on that day is already booked. Please choose a different time slot.`,
      );
    }

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

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(calEvent),
      },
    );

    if (!calRes.ok) {
      const errText = await calRes.text();
      console.error("[create-booking] Calendar API error:", calRes.status, errText);
      return ok({ success: true, meetLink: null, calendarEventLink: null });
    }

    const ev = await calRes.json();
    const meetLink =
      ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
    const calendarEventLink = ev.htmlLink ?? null;

    await sendNotificationEmail({ name, email, phone, meetingType, preferredDate, preferredTime, timezone, message, meetLink, label });

    return ok({ success: true, meetLink, calendarEventLink });
  } catch (err) {
    console.error("[create-booking] Fatal error:", err.message);
    return ok({ success: true, meetLink: null, calendarEventLink: null });
  }
};
