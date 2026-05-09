const https = require("https");
const querystring = require("querystring");

const TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM",
  "03:00 PM", "04:00 PM", "05:00 PM",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  const body = querystring.stringify({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const result = await httpsRequest(
    "oauth2.googleapis.com", "/token", "POST",
    { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  );
  const data = JSON.parse(result.body);
  if (!data.access_token) throw new Error("Token error");
  return data.access_token;
}

const allAvailable = () => Object.fromEntries(TIME_SLOTS.map((s) => [s, true]));

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  const date = req.query.date;
  const timezone = req.query.timezone || "UTC";

  if (!date) {
    context.res = { status: 400, headers: CORS, body: JSON.stringify({ error: "Missing date param" }) };
    return;
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CALENDAR_ID) {
    context.res = { status: 200, headers: CORS, body: JSON.stringify({ available: allAvailable() }) };
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    const dayStart = localToUTCISO(date, 0, 0, timezone);
    const dayEnd = localToUTCISO(date, 23, 59, timezone);

    const freeBusyBody = JSON.stringify({ timeMin: dayStart, timeMax: dayEnd, items: [{ id: calendarId }] });
    const res = await httpsRequest(
      "www.googleapis.com",
      "/calendar/v3/freeBusy",
      "POST",
      { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      freeBusyBody,
    );

    if (res.status !== 200) throw new Error("freeBusy API error");

    const data = JSON.parse(res.body);
    const busyPeriods = data.calendars?.[calendarId]?.busy ?? [];

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

    context.res = { status: 200, headers: CORS, body: JSON.stringify({ available }) };
  } catch (err) {
    context.log.error("get-availability error:", err);
    context.res = { status: 200, headers: CORS, body: JSON.stringify({ available: allAvailable() }) };
  }
};
