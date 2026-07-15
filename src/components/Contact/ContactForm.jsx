import React from "react";
import { FaPaperPlane, FaCheckCircle } from "react-icons/fa";
import { useContactForm } from "./useContactForm";
import FormFields from "./FormFields";
import ResponseTimeNote from "./ResponseTimeNote";

const ContactForm = () => {
  const { formData, status, responseMessage, handleInputChange, handleSubmit } = useContactForm();

  return (
    <div className="glass-card p-8">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Send a Message</h3>

      <form
        action="https://api.web3forms.com/submit"
        method="POST"
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        <FormFields formData={formData} handleInputChange={handleInputChange} />

        {/* Show inline status messages (success / error) */}
        {status === "success" && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded bg-success-100 border border-success-500/30 text-success-700 flex items-center gap-3 dark:bg-success-400/10 dark:border-success-400/30 dark:text-success-400"
          >
            <FaCheckCircle
              className="w-5 h-5 text-success-700 dark:text-success-400 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{responseMessage}</span>
          </div>
        )}
        {status === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded bg-error-400/10 border border-error-400/30 text-error-400"
          >
            {responseMessage}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === "sending"}
          className={`w-full glass-btn bg-gradient-to-r from-oceanic-600 to-oceanic-800 text-white py-3 font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
            status === "sending" ? "opacity-70 cursor-wait" : "hover:scale-105"
          }`}
        >
          <FaPaperPlane className="w-4 h-4" />
          {status === "sending" ? "Sending..." : "Send Message"}
        </button>
      </form>

      <ResponseTimeNote />
    </div>
  );
};

export default ContactForm;
