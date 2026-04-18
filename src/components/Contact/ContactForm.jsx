import React from "react";
import { FaPaperPlane, FaCheckCircle } from "react-icons/fa";
import { useContactForm } from "./useContactForm";
import FormFields from "./FormFields";
import ResponseTimeNote from "./ResponseTimeNote";

const ContactForm = () => {
  const { formData, status, responseMessage, handleInputChange, handleSubmit } =
    useContactForm();

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
            className="p-3 rounded bg-green-100 border border-green-200 text-green-800 flex items-center gap-3 dark:bg-green-600/20 dark:border-green-500/30 dark:text-green-200"
          >
            <FaCheckCircle
              className="w-5 h-5 text-green-600 dark:text-green-300 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{responseMessage}</span>
          </div>
        )}
        {status === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded bg-red-600/10 border border-red-500/20 text-red-300"
          >
            {responseMessage}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === "sending"}
          className={`w-full glass-btn bg-gradient-to-r from-oceanic-600 to-purple-600 text-white py-3 font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
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
