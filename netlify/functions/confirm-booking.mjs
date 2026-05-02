const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MEETING_LABELS = {
  discovery: "Discovery Call",
  project: "Project Discussion",
  mentorship: "Mentorship Session",
  general: "General Chat",
};

const ok = (body) => ({
  statusCode: 200,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const err = (status, message) => ({
  statusCode: status,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify({ error: message }),
});

function buildConfirmedEmail({ name, label, preferredDate, preferredTime, timezone, meetingLink }) {
  const tzLine = timezone ? ` (${timezone})` : "";
  const linkRow = meetingLink
    ? `<tr><td style="padding:10px;font-weight:600;color:#475569">Meet Link</td><td style="padding:10px"><a href="${meetingLink}" style="color:#0ea5e9">${meetingLink}</a></td></tr>`
    : "";
  const cta = meetingLink
    ? `<p style="margin:24px 0"><a href="${meetingLink}" style="background:#0ea5e9;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600">Join Meeting</a></p>`
    : "";

  return {
    subject: `Confirmed: Your ${label} with Illona`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="color:#0ea5e9;margin:0 0 16px 0">You're confirmed!</h1>
  <p>Hi ${name},</p>
  <p>I've confirmed your <strong>${label}</strong> and will be there. Looking forward to our chat.</p>
  <table style="border-collapse:collapse;width:100%;margin-top:16px;background:#f8fafc;border-radius:8px;overflow:hidden">
    <tr><td style="padding:10px;font-weight:600;color:#475569">Date</td><td style="padding:10px">${preferredDate}</td></tr>
    <tr style="background:#fff"><td style="padding:10px;font-weight:600;color:#475569">Time</td><td style="padding:10px">${preferredTime}${tzLine}</td></tr>
    <tr><td style="padding:10px;font-weight:600;color:#475569">Type</td><td style="padding:10px">${label}</td></tr>
    ${linkRow}
  </table>
  ${cta}
  <p style="margin-top:24px">If anything changes, just reply to this email — I'm easy to reach.</p>
  <p style="margin-bottom:32px">See you soon,<br/><strong>Illona Addae</strong></p>
  <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px">Sent from OceanicCoder · oceaniccoder.dev</p>
</div>`,
  };
}

function buildCancelledEmail({ name, label, preferredDate, preferredTime }) {
  return {
    subject: `Update on your ${label}`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="color:#0ea5e9;margin:0 0 16px 0">About your booking</h1>
  <p>Hi ${name},</p>
  <p>Thank you for booking a <strong>${label}</strong> for ${preferredDate} at ${preferredTime}. Unfortunately, I won't be able to make it at that time.</p>
  <p>I'd love to reschedule — please pick another slot that works:</p>
  <p style="margin:24px 0"><a href="https://oceaniccoder.dev/booking" style="background:#0ea5e9;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600">Pick a New Time</a></p>
  <p>Apologies for the inconvenience and thanks for your patience.</p>
  <p style="margin-bottom:32px">Best,<br/><strong>Illona Addae</strong></p>
  <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px">Sent from OceanicCoder · oceaniccoder.dev</p>
</div>`,
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return err(400, "Invalid JSON");
  }

  const { status, name, email, meetingType, preferredDate, preferredTime, timezone, meetingLink } = body;

  if (!status || !name || !email || !meetingType || !preferredDate || !preferredTime) {
    return err(400, "Missing required fields");
  }
  if (status !== "confirmed" && status !== "cancelled") {
    return err(400, "Invalid status");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[confirm-booking] RESEND_API_KEY not set");
    return err(500, "Email service not configured");
  }

  const label = MEETING_LABELS[meetingType] ?? meetingType;
  const emailData =
    status === "confirmed"
      ? buildConfirmedEmail({ name, label, preferredDate, preferredTime, timezone, meetingLink })
      : buildCancelledEmail({ name, label, preferredDate, preferredTime });

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "OceanicCoder <onboarding@resend.dev>",
        to: email,
        ...emailData,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[confirm-booking] Resend error:", resp.status, errText);
      return err(500, "Failed to send email");
    }
    return ok({ success: true });
  } catch (e) {
    console.error("[confirm-booking] Fatal:", e.message);
    return err(500, "Email send failed");
  }
};
