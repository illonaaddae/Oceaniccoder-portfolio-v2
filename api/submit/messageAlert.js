// The admin alert for a new contact-form message. It replaces the Appwrite
// Function "Contact Email Notification", which fired on every new row in
// `messages`. Separate from index.js so the email catalog can render it
// without loading the Cosmos and image dependencies.

const { shell, heading, card, p, button, buttons } = require("../shared/email/ui");

const DASHBOARD_URL = "https://oceaniccoder.dev/dashboard";

/** Returns { subject, html, text }. Inputs are raw visitor text; the email kit escapes them. */
function messageAlertEmail({ name, email, subject, message }) {
  // A subject header is one line, whatever the visitor typed.
  const oneLine = String(subject).replace(/\s+/g, " ").trim();
  const body = String(message).replace(/\r\n?/g, "\n");
  const html = shell({
    preview: `New message from ${name}`,
    reason: "Sent to you as the OceanicCoder admin. Reply to this email to answer the sender.",
    body:
      heading({ eyebrow: "New contact message", title: oneLine }) +
      card({
        title: "From",
        rows: [
          ["Name", name],
          ["Email", email],
        ],
      }) +
      p(body) +
      buttons(button({ href: DASHBOARD_URL, label: "View in Dashboard" })),
  });
  const text = `From: ${name} <${email}>\nSubject: ${oneLine}\n\n${body}`;
  return { subject: `New Contact: ${oneLine}`, html, text };
}

module.exports = { messageAlertEmail };
