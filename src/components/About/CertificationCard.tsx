import React from "react";
import { FaDownload, FaCertificate, FaAward, FaCalendarAlt } from "react-icons/fa";
import PlatformLogo from "../PlatformLogo";
import CredentialBadge from "./CredentialBadge";

import type { Certification } from "../../types";

interface CertificationCardProps {
  cert: Certification;
}

/**
 * Mirrors EducationCard's structure deliberately: title, issuer, a plain-text
 * meta line, then one row of full-radius pills. Metadata chips all share a
 * single radius and padding — mixing rounded-md skill tags with rounded-full
 * platform tags is what made this card read as unfinished next to the
 * education cards it sits under.
 */
const CertificationCard = React.memo(({ cert }: CertificationCardProps) => (
  <div className="glass-card w-full max-w-none p-6 hover:scale-105 transition-all duration-300 certification-card">
    <div className="flex items-start gap-4">
      <div className="text-3xl text-oceanic-400 cert-icon">
        <FaCertificate className="text-oceanic-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base sm:text-lg font-bold text-white cert-title mb-1">{cert.title}</h4>
        <p className="text-oceanic-500 font-medium cert-issuer mb-1">{cert.issuer}</p>

        {/* Meta line — plain text, like the education card's period row */}
        {cert.date && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-200 cert-date mb-3">
            <span className="flex items-center gap-1.5">
              <FaCalendarAlt className="text-oceanic-400 text-xs" />
              {cert.date}
            </span>
          </div>
        )}

        {/* Badges — one radius, one padding, one type scale */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {cert.platform && (
            <div className="inline-flex items-center gap-2 bg-gray-700/30 text-gray-200 text-xs px-3 py-1.5 rounded-full border border-gray-600/50 font-medium shadow-sm platform-tag">
              <PlatformLogo
                platformName={cert.platform}
                iconUrl={cert.platformIconUrl ?? undefined}
                className="w-4 h-4 flex-shrink-0"
              />
              <span>{cert.platform}</span>
            </div>
          )}
          {cert.certificationType && (
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-oceanic-500/20 to-oceanic-700/20 text-oceanic-400 text-xs px-3 py-1.5 rounded-full border border-oceanic-500/30 font-medium shadow-sm cert-type">
              <FaAward className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              {cert.certificationType}
            </div>
          )}
          {cert.credential && <CredentialBadge credential={cert.credential} />}
        </div>

        {/* Skills */}
        {(cert.skills ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(cert.skills ?? []).map((skill: string) => (
              <span
                key={skill}
                className="inline-block bg-gray-700/30 text-gray-200 text-xs px-3 py-1.5 rounded-full border border-gray-600/50 font-medium shadow-sm skill-tag"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

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
    </div>
  </div>
));

CertificationCard.displayName = "CertificationCard";
export default CertificationCard;
