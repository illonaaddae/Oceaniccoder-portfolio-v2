import { Client, Messaging } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const messaging = new Messaging(client);

  // Get the new message data from the event
  let message;
  try {
    message = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    message = req.body;
  }

  log(`New contact message from: ${message.name || "Unknown"}`);

  try {
    await messaging.createEmail(
      "unique()",
      `🌊 New Contact: ${message.subject}`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0891b2;">New Portfolio Message</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>From:</strong> ${message.name}</p>
          <p><strong>Email:</strong> <a href="mailto:${message.email}">${message.email}</a></p>
          <p><strong>Subject:</strong> ${message.subject}</p>
          <hr style="border: 1px solid #e5e7eb;">
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message.message}</p>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
          Sent from your Oceaniccoder Portfolio contact form
        </p>
      </div>`,
      [], // topics
      [], // users
      ["addaeillona@gmail.com"], // targets - YOUR EMAIL
      [], // cc
      [], // bcc
      false, // draft
      true // html
    );

    log("✅ Notification email sent successfully!");
    return res.json({ success: true });
  } catch (err) {
    error("❌ Error sending email: " + err.message);
    return res.json({ success: false, error: err.message });
  }
};
