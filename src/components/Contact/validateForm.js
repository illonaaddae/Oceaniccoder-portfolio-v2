/**
 * Validates contact form data before submission.
 * Returns { valid: true } or { valid: false, message: string }.
 */
export function validateForm(formDataObj, lastSubmissionTime, formStartTime) {
  const now = Date.now();

  // Honeypot spam check - if honeypot field is filled, it's spam
  const honeypot = formDataObj.get("website");
  if (honeypot && honeypot.toString().trim() !== "") {
    console.warn("Spam detected: honeypot field filled");
    return { valid: false, message: "Spam detected. Please try again." };
  }

  // Rate limiting - prevent submissions within 10 seconds
  if (lastSubmissionTime && now - lastSubmissionTime < 10000) {
    return {
      valid: false,
      message: "Please wait a few seconds before submitting again.",
    };
  }

  // Human behavior check - form must be open for at least 3 seconds
  const formFillTime = now - formStartTime;
  if (formFillTime < 3000) {
    return {
      valid: false,
      message: "Please take your time filling out the form.",
    };
  }

  // Basic content validation
  const message = formDataObj.get("message")?.toString().trim() || "";
  if (message.length < 10) {
    return {
      valid: false,
      message:
        "Please provide a more detailed message (at least 10 characters).",
    };
  }

  return { valid: true };
}
