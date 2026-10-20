// The admin alert for a new contact-form message. It replaces the Appwrite
// Function "Contact Email Notification", which fired on every new row in
// `messages`. Separate from index.js so the email catalog can render it
// without loading the Cosmos and image dependencies.

const { shell, heading, card, p, button, buttons } = require("../shared/email/ui");

const DASHBOARD_URL = "https://oceaniccoder.dev/admin/dashboard";

// Stricter than the form's email check: any of these could make one Reply-To
// header name several addresses or carry a display name.
const UNSAFE_IN_REPLY_TO = /[\s,;<>"()[\]\\]/;
const MALFORMED_NOTE =
  "The sender's email address looked malformed, so replies won't go to it. Check it before writing back.";

/** True when the visitor's address is safe to use as the Reply-To header. */
function isSafeReplyTo(email) {
  const value = String(email);
  return value.includes("@") && !UNSAFE_IN_REPLY_TO.test(value);
}

/** Returns { subject, html, text }. Inputs are raw visitor text; the email kit escapes them. */
function messageAlertEmail({ name, email, subject, message }) {
  // A subject header is one line, whatever the visitor typed.
  const oneLine = String(subject).replace(/\s+/g, " ").trim();
  const body = String(message).replace(/\r\n?/g, "\n");
  const replyable = isSafeReplyTo(email);
  const html = shell({
    preview: `New message from ${name}`,
    reason: replyable
      ? "Sent to you as the OceanicCoder admin. Reply to this email to answer the sender."
      : "Sent to you as the OceanicCoder admin.",
    body:
      heading({ eyebrow: "New contact message", title: oneLine }) +
      card({
        title: "From",
        rows: [
          ["Name", name],
          ["Email", email],
        ],
      }) +
      (replyable ? "" : p(MALFORMED_NOTE)) +
      p(body) +
      buttons(button({ href: DASHBOARD_URL, label: "View in Dashboard" })),
  });
  const note = replyable ? "" : `${MALFORMED_NOTE}\n\n`;
  const text = `From: ${name} <${email}>\nSubject: ${oneLine}\n\n${note}${body}`;
  return { subject: `New Contact: ${oneLine}`, html, text };
}

module.exports = { messageAlertEmail, isSafeReplyTo };
