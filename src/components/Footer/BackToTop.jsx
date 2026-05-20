import React, { useCallback } from "react";
import { FaArrowUp } from "react-icons/fa";

const BackToTop = React.memo(() => {
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      onClick={scrollToTop}
      className="glass-btn p-3 text-gray-200 hover:text-brand-link dark:hover:text-oceanic-400 hover:scale-110 transition-all duration-300 group"
      aria-label="Back to top"
    >
      <FaArrowUp className="w-4 h-4 group-hover:animate-bounce" />
    </button>
  );
});

BackToTop.displayName = "BackToTop";

export default BackToTop;
