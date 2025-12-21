import React from "react";

/**
 * SkipToContent Component
 *
 * Accessibility feature that allows keyboard users to skip navigation
 * and jump directly to the main content. The link is visually hidden
 * until focused, making it keyboard-accessible but not cluttering the UI.
 *
 * Usage: Place at the very top of the app, before navigation.
 */
const SkipToContent: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="skip-to-content sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 transition-all duration-200"
      onClick={(e) => {
        e.preventDefault();
        const mainContent = document.getElementById("main-content");
        if (mainContent) {
          mainContent.focus();
          mainContent.scrollIntoView({ behavior: "smooth" });
        }
      }}
    >
      Skip to main content
    </a>
  );
};

export default SkipToContent;
