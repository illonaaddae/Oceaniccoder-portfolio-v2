import React, { useState, useEffect } from "react";
import { FaArrowUp } from "react-icons/fa";

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 glass-btn p-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:scale-110 transition-all duration-300 group shadow-lg"
      aria-label="Scroll to top"
    >
      <FaArrowUp className="w-5 h-5 group-hover:animate-bounce" />
    </button>
  );
};

export default ScrollToTop;
