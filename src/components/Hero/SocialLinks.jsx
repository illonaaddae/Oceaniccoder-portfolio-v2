import React from "react";
import { FaDownload } from "react-icons/fa";
import { DEFAULT_RESUME_URL } from "./heroData";

const SocialLinks = React.memo(function SocialLinks({ resumeUrl }) {
  return (
    <div>
      <a
        href={resumeUrl || DEFAULT_RESUME_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 text-gray-300 hover:text-teal-400 transition-colors duration-300 group text-base font-medium"
        aria-label="Download CV resume"
      >
        <FaDownload className="w-4 h-4 group-hover:animate-bounce" />
        <span>Download CV</span>
      </a>
    </div>
  );
});

export default SocialLinks;
