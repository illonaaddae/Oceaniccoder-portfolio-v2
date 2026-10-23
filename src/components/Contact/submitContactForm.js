import { createMessage } from "../../services/api";

const REQUEST_TIMEOUT_MS = 30000;
const TIMEOUT_ERROR = "Request timed out. Please check your internet connection and try again.";
const NETWORK_ERROR =
  "Network error: Unable to connect to the server. Please check your internet connection or try again later. You can also reach me directly at hello@oceaniccoder.dev";
const SUCCESS = {
  success: true,
  message: "Thanks, I received your message. I'll get back to you within 24 hours!",
};

function messageRow(formData) {
  return {
    name: formData.name,
    email: formData.email,
    subject: formData.subject,
    message: formData.message,
    status: "new",
  };
}

/**
 * Sends the contact form to /api/submit, which saves the message and emails
 * the admin, so its answer (including a failed spam check) is what the
 * visitor sees.
 */
export async function submitContactForm(formData, turnstileToken) {
  try {
    await createMessage(messageRow(formData), turnstileToken, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") throw new Error(TIMEOUT_ERROR);
    if (err instanceof TypeError) throw new Error(NETWORK_ERROR);
    throw err;
  }
  return SUCCESS;
}
