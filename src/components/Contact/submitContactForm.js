import { createMessage } from "../../services/api";
import { usesCosmos } from "../../services/api/dataApi";

const ACCESS_KEY = "e0faddf8-32ef-4a92-b097-8aec3e900163";
const API_URL = "https://api.web3forms.com/submit";

function prepareFormData(fd) {
  if (!fd.has("access_key")) fd.append("access_key", ACCESS_KEY);
  const name = (fd.get("name") || "Someone").toString().trim();
  const subj = (fd.get("subject") || "").toString().trim();
  fd.set("subject", subj ? `${name}: ${subj}` : `${name} sent a message from website`);
  fd.set("from_name", name);
  const email = (fd.get("email") || "").toString().trim();
  if (email) fd.set("reply_to", email);
  fd.set("_timestamp", Date.now().toString());
}

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
 * With Cosmos, /api/submit saves the message and emails the admin, so its
 * answer (including a failed spam check) is what the visitor sees.
 */
async function submitThroughServer(formData, turnstileToken) {
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

/**
 * Sends the contact form. On Appwrite it goes to Web3Forms (which emails the
 * admin) and a copy is saved to the database; with Cosmos it goes only to
 * /api/submit.
 */
export async function submitContactForm(formDataToSend, formData, turnstileToken) {
  if (usesCosmos) return submitThroughServer(formData, turnstileToken);
  prepareFormData(formDataToSend);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formDataToSend,
      signal: controller.signal,
      mode: "cors",
      cache: "no-cache",
    });
    clearTimeout(timeoutId);
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError.name === "AbortError") {
      throw new Error(TIMEOUT_ERROR);
    }
    if (fetchError instanceof TypeError && fetchError.message.includes("Failed to fetch")) {
      throw new Error(NETWORK_ERROR);
    }
    throw fetchError;
  }
  let json = null;
  try {
    const text = await res.text();
    if (text) json = JSON.parse(text);
  } catch (parseError) {
    console.error("Failed to parse response:", parseError);
  }
  if (!res.ok) {
    const errorMsg = (json && json.message) || `Status ${res.status}`;
    if (errorMsg.toLowerCase().includes("spam")) {
      throw new Error(
        "Your message was flagged as spam. Please ensure your message is genuine and try again, or contact me directly via email.",
      );
    }
    throw new Error(errorMsg || `Server error: ${res.status}`);
  }
  if (json && json.success === false) {
    throw new Error(
      json.message ||
        "The form submission was not successful. Please try again or contact me directly at hello@oceaniccoder.dev",
    );
  }
  // Save to database (fire-and-forget)
  createMessage(messageRow(formData), turnstileToken).catch((dbError) =>
    console.warn("Failed to save message to database:", dbError),
  );
  return SUCCESS;
}
