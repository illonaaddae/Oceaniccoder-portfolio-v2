import React from "react";
import { FaChevronDown } from "react-icons/fa";

const ScrollIndicator = React.memo(function ScrollIndicator({ onScroll }) {
  return (
    <div className="mt-12 lg:mt-16 pb-8 flex justify-center">
      <button
        onClick={onScroll}
        className="flex flex-col items-center space-y-2 text-teal-500/70 dark:text-teal-400/70 hover:text-teal-500 dark:hover:text-teal-400 transition-all duration-300 group animate-bounce"
        aria-label="Explore skills section"
      >
        <div className="flex flex-col items-center">
          <FaChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
          <FaChevronDown className="w-4 h-4 -mt-2 opacity-60 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <span className="text-xs font-medium tracking-wide opacity-80">
          Explore
        </span>
      </button>
    </div>
  );
});

export default ScrollIndicator;
