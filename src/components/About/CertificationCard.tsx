import React from "react";
import { FaDownload, FaCertificate } from "react-icons/fa";
import PlatformLogo from "../PlatformLogo";

import type { Certification } from "../../types";

interface CertificationCardProps {
  cert: Certification;
}

const CertificationCard = React.memo(({ cert }: CertificationCardProps) => (
  <div className="glass-card w-full max-w-none p-6 hover:scale-105 transition-all duration-300 certification-card">
    {/* Stack meta on small screens; align in a row on sm+ */}
    <div className="flex flex-col sm:flex-row items-start justify-between mb-3 gap-3">
      <div className="flex-1 min-w-0">
        <h4 className="text-base sm:text-lg font-bold text-white cert-title mb-1">
          {cert.title}
        </h4>
        <p className="text-purple-400 font-medium cert-issuer mb-2">
          {cert.issuer}
        </p>
        {/* Platform Tag */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium shadow-sm platform-tag ${
              cert.platform === "Frontend Masters" ||
              cert.platform === "Scrimba"
                ? "border-gray-600/50 bg-gray-700/30 text-gray-300"
                : `${cert.platformColor} bg-current/10 text-current border-current/30`
            }`}
          >
            <PlatformLogo
              platformName={cert.platform}
              className="w-4 h-4 flex-shrink-0"
            />
            {cert.platform}
          </span>
          <span className="text-xs text-gray-400 bg-gray-700/20 px-2 py-1 rounded cert-date">
            {cert.date}
          </span>
        </div>
      </div>
      <div className="text-right ml-0 sm:ml-4 flex-shrink-0">
        <span className="inline-block text-xs bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 px-2.5 py-1 rounded border border-purple-500/30 sm:whitespace-nowrap font-medium shadow-sm cert-credential">
          {cert.credential}
        </span>
      </div>
    </div>

    {/* Skills */}
    <div className="flex flex-wrap gap-2 mt-3 mb-4">
      {cert.skills.map((skill: string) => (
        <span
          key={skill}
          className="text-xs bg-gray-700/50 text-gray-300 px-2.5 py-1 rounded border border-gray-600/30 font-medium shadow-sm skill-tag"
        >
          {skill}
        </span>
      ))}
    </div>

    {/* Action Buttons */}
    <div className="flex flex-col sm:flex-row gap-2">
      <a
        href={cert.downloadLink}
        download
        className="flex-1 glass-btn bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white py-2 px-3 text-sm font-medium hover:scale-105 transition-all duration-300 inline-flex items-center justify-center gap-2"
      >
        <FaDownload className="w-3 h-3" />
        Download
      </a>
      <a
        href={cert.verifyLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 glass-btn border border-oceanic-500/40 text-oceanic-500 py-2 px-3 text-sm font-medium hover:scale-105 hover:bg-oceanic-500/10 transition-all duration-300 inline-flex items-center justify-center gap-2"
      >
        <FaCertificate className="w-3 h-3" />
        Verify
      </a>
    </div>
  </div>
));

CertificationCard.displayName = "CertificationCard";
export default CertificationCard;
