import React from "react";
import { FaArrowRight, FaBriefcase } from "react-icons/fa";

const HeroContent = React.memo(function HeroContent({ displayText, onViewProjects, onHireMe }) {
  return (
    <>
      {/* Role — an eyebrow above the name rather than a boxed chip below it.
          It reads as a label instead of a text input, and it puts the answer
          to "who is this" before the name rather than after. */}
      <p className="hero-eyebrow justify-center lg:justify-start w-full lg:w-auto">
        <span>{displayText}</span>
        <span className="hero-eyebrow__caret" aria-hidden="true">
          |
        </span>
      </p>

      {/* Name */}
      <h1 className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-heading font-bold leading-[0.95] tracking-tighter">
        <span className="text-oceanic-600 dark:text-oceanic-500">Illona </span>
        <span className="text-gray-700 dark:text-gray-100">Addae</span>
      </h1>

      {/* Oceaniccoder */}
      <h2 className="text-lg sm:text-xl lg:text-2xl font-display font-semibold tracking-tight">
        <span className="text-gray-700 dark:text-gray-100">Oceanic</span>
        <span className="text-oceanic-600 dark:text-oceanic-500">coder</span>
      </h2>

      {/* Tagline */}
      <p className="hero-quote text-base lg:text-lg max-w-xl leading-relaxed">
        In a world of can&apos;ts, she whispers I can, and in doing so, she became an unstoppable
        force.
      </p>

      {/* Action Buttons */}
      <div className="flex gap-3 sm:gap-4 flex-wrap justify-center lg:justify-start">
        <button
          onClick={onViewProjects}
          className="hero-btn-primary px-5 sm:px-7 py-3 rounded-xl font-semibold flex items-center gap-2 sm:gap-3 hover:scale-105 transition-transform duration-300"
        >
          View My Projects
          <FaArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onHireMe}
          className="hero-btn-outline border-2 border-oceanic-500 px-5 sm:px-7 py-3 rounded-xl font-semibold flex items-center gap-2 sm:gap-3 hover:scale-105 transition-transform duration-300"
        >
          <FaBriefcase className="w-4 h-4" />
          Hire Me
        </button>
      </div>
    </>
  );
});

export default HeroContent;
