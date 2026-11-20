// The admin alerts for a new project inquiry: an email and a short SMS. They
// replace /api/notify-inquiry, which anyone could call with any text. Built
// only from the saved row, after /api/submit has checked Turnstile and the
// alert caps. Separate from index.js so the email catalog can render it
// without loading the Cosmos and image dependencies.

const { shell, heading, card, button, buttons } = require("../shared/email/ui");

const DASHBOARD_URL = "https://oceaniccoder.dev/admin/dashboard";
const SMS_FIELD_MAX = 40;
const SUBJECT_NAME_MAX = 60;

/** One line, at most `max` characters, ending in `more` when cut. */
function clip(value, max, more = "…") {
  const line = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return line.length > max ? `${line.slice(0, max - more.length).trimEnd()}${more}` : line;
}

/** Returns { subject, html, text }. Inputs are raw visitor text; the email kit escapes them. */
function inquiryAlertEmail({ name, email, projectType }) {
  const who = clip(name, SUBJECT_NAME_MAX) || "someone";
  const html = shell({
    preview: `New project inquiry from ${who}`,
    reason: "Sent to you as the OceanicCoder admin.",
    body:
      heading({ eyebrow: "New project inquiry", title: "Someone wants to work with you" }) +
      card({
        title: "Inquiry",
        rows: [
          ["Name", name || "N/A"],
          ["Email", email || "N/A"],
          ["Project type", projectType || "N/A"],
        ],
      }) +
      buttons(button({ href: DASHBOARD_URL, label: "View in Dashboard" })),
  });
  const text =
    `Name: ${name || "N/A"}\nEmail: ${email || "N/A"}\nProject type: ${projectType || "N/A"}\n\n` +
    `View in Dashboard: ${DASHBOARD_URL}`;
  return { subject: `New project inquiry from ${who}`, html, text };
}

/**
 * One SMS segment's worth: the visitor's fields are cut short so they can't run
 * up the cost. Cut with "..." rather than "…", which would force UCS-2 and
 * shrink a segment from 160 characters to 70.
 */
function inquiryAlertSms({ name, projectType }) {
  const who = clip(name, SMS_FIELD_MAX, "...") || "someone";
  const what = clip(projectType, SMS_FIELD_MAX, "...") || "unknown";
  return `New inquiry from ${who} (${what}). View: oceaniccoder.dev/admin/dashboard`;
}

/** Sends an SMS through Africa's Talking. Returns { ok, error }; never throws. */
async function sendSms(to, message) {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username) return { ok: false, error: "AT_API_KEY or AT_USERNAME is not set" };
  if (!to) return { ok: false, error: "no recipient" };
  const params = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) params.set("from", process.env.AT_SENDER_ID);
  try {
    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, error: `Africa's Talking ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { inquiryAlertEmail, inquiryAlertSms, sendSms, SMS_FIELD_MAX };
