// The single Resend sender for the new email templates. Failures are returned,
// never thrown, so an email problem can't undo the state change that caused it.

const CONTACT = "hello@oceaniccoder.dev";

async function sendEmail({ to, subject, html, text, replyTo = CONTACT }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY is not configured" };
  if (!to) return { ok: false, error: "no recipient" };
  const from = process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `OceanicCoder <${from}>`,
        to: [to],
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.message || `Resend ${res.status}` };
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendEmail };
