import React from "react";
import { FaArrowRight, FaBriefcase } from "react-icons/fa";

const HeroContent = React.memo(function HeroContent({
  displayText,
  onViewProjects,
  onHireMe,
}) {
  return (
    <>
      {/* Name */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-heading font-bold leading-tight tracking-tight">
        <span className="text-oceanic-600 dark:text-oceanic-500 font-bold tracking-wide">
          Illona{" "}
        </span>
        <span className="text-gray-700 dark:text-gray-100">Addae</span>
      </h1>

      {/* Oceaniccoder */}
      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-display font-bold leading-tight tracking-wide">
        <span className="text-gray-700 dark:text-gray-100">Oceanic</span>
        <span className="text-oceanic-600 dark:text-oceanic-500 font-bold tracking-wide">
          coder
        </span>
      </h2>

      {/* Tagline */}
      <p className="text-base sm:text-lg lg:text-xl max-w-2xl lg:max-w-none leading-relaxed text-gray-200 dark:text-gray-300 font-light">
        <span className="text-white font-medium">
          "In a world of can'ts, she whispers I can, and in doing so, she became
          an unstoppable force."
        </span>
      </p>

      {/* Role Display */}
      <div className="flex justify-center lg:justify-start">
        <div className="glass-card bg-gradient-to-r from-white/10 to-white/5 border border-teal-600/25 rounded-xl px-6 py-3 backdrop-blur-md inline-block">
          <h3 className="text-lg lg:text-xl font-bold">
            <span className="text-oceanic-600 dark:text-oceanic-500 font-bold">
              {displayText}
            </span>
            <span className="ml-1 text-teal-500 dark:text-teal-300 animate-pulse text-xl">
              |
            </span>
          </h3>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-5 flex-wrap justify-center lg:justify-start">
        <button
          onClick={onViewProjects}
          className="hero-btn-primary px-7 py-3 rounded-xl font-semibold flex items-center gap-3 hover:scale-105 transition-all duration-300"
          aria-label="Navigate to projects section"
        >
          View My Projects
          <FaArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onHireMe}
          className="hero-btn-outline border-2 border-oceanic-500 px-7 py-3 rounded-xl font-semibold flex items-center gap-3 hover:scale-105 transition-all duration-300"
          aria-label="Navigate to contact section"
        >
          <FaBriefcase className="w-4 h-4" />
          Hire Me
        </button>
      </div>
    </>
  );
});

export default HeroContent;
