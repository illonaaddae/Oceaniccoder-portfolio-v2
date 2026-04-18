const TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM",
  "03:00 PM", "04:00 PM", "05:00 PM",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

function localToUTCISO(dateStr, hours, minutes, tz) {
  const naive = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  const asUTC = new Date(naive + "Z");
  const formatted = asUTC.toLocaleString("en-CA", {
    timeZone: tz || "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const localParsed = new Date(formatted.replace(", ", "T") + "Z");
  const offset = asUTC.getTime() - localParsed.getTime();
  return new Date(asUTC.getTime() + offset).toISOString();
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
  if (!data.access_token) throw new Error("Token error");
  return data.access_token;
}

const allAvailable = () => Object.fromEntries(TIME_SLOTS.map((s) => [s, true]));

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const date = event.queryStringParameters?.date;
  const timezone = event.queryStringParameters?.timezone || "UTC";

  if (!date) {
    return {
      statusCode: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing date param" }),
    };
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CALENDAR_ID) {
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ available: allAvailable() }),
    };
  }

  try {
    const accessToken = await getAccessToken();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    const dayStart = localToUTCISO(date, 0, 0, timezone);
    const dayEnd = localToUTCISO(date, 23, 59, timezone);

    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin: dayStart, timeMax: dayEnd, items: [{ id: calendarId }] }),
    });

    if (!res.ok) throw new Error("freeBusy API error");

    const data = await res.json();
    const busyPeriods = data.calendars?.[calendarId]?.busy ?? [];

    // Check each slot against busy periods using a 30-min window (minimum meeting duration)
    const SLOT_MS = 30 * 60 * 1000;
    const available = {};
    for (const slot of TIME_SLOTS) {
      const { hours, minutes } = parseTime(slot);
      const slotStart = new Date(localToUTCISO(date, hours, minutes, timezone)).getTime();
      const slotEnd = slotStart + SLOT_MS;
      available[slot] = !busyPeriods.some(({ start, end }) => {
        return slotStart < new Date(end).getTime() && slotEnd > new Date(start).getTime();
      });
    }

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ available }),
    };
  } catch (err) {
    console.error("get-availability error:", err);
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ available: allAvailable() }),
    };
  }
};
