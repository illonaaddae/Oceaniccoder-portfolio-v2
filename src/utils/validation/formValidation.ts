/**
 * Form Validation
 * @module utils/validation/formValidation
 */

import {
  validateName,
  validateEmail,
  validateSubject,
  validateMessage,
} from "./validators";
import type { FormValidationErrors } from "./types";

/**
 * Validates a contact form submission
 */
export function validateContactForm(data: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): {
  isValid: boolean;
  errors: FormValidationErrors;
  sanitized: typeof data;
} {
  const nameResult = validateName(data.name);
  const emailResult = validateEmail(data.email);
  const subjectResult = data.subject
    ? validateSubject(data.subject)
    : { isValid: true, sanitized: "" };
  const messageResult = validateMessage(data.message);

  const errors: FormValidationErrors = {};

  if (!nameResult.isValid) errors.name = nameResult.error;
  if (!emailResult.isValid) errors.email = emailResult.error;
  if (!subjectResult.isValid) errors.subject = subjectResult.error;
  if (!messageResult.isValid) errors.message = messageResult.error;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name: nameResult.sanitized || "",
      email: emailResult.sanitized || "",
      subject: subjectResult.sanitized || "",
      message: messageResult.sanitized || "",
    },
  };
}
