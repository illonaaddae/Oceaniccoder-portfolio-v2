import React from "react";
import { FaGraduationCap, FaMapMarkerAlt } from "react-icons/fa";

import type { Education } from "../../types";

interface EducationCardProps {
  edu: Education;
}

const EducationCard = React.memo(({ edu }: EducationCardProps) => (
  <div className="glass-card w-full max-w-none p-6 hover:scale-105 transition-all duration-300 education-card">
    <div className="flex items-start gap-4">
      <div className="text-3xl text-blue-400 edu-icon">
        <FaGraduationCap className="text-blue-400" />
      </div>
      <div className="flex-1">
        <h4 className="text-lg font-bold text-white edu-title mb-1">
          {edu.degree}
          {edu.field && (
            <span className="text-oceanic-500 font-normal">
              {" "}
              in {edu.field}
            </span>
          )}
        </h4>
        <p className="text-oceanic-500 font-medium edu-institution mb-1">
          {edu.institution}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 edu-period mb-3">
          <span>{edu.period}</span>
          {edu.location && (
            <span className="flex items-center gap-1">
              <FaMapMarkerAlt className="text-red-400 text-xs" />
              {edu.location}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {edu.achievement && edu.achievement !== "N/A" ? (
            <div className="inline-block bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 text-xs px-3 py-1.5 rounded-full border border-green-500/30 font-medium shadow-sm edu-badge">
              {edu.achievement}
            </div>
          ) : (
            <div className="inline-block bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-400 text-xs px-3 py-1.5 rounded-full border border-gray-500/30 font-medium shadow-sm edu-badge">
              Not Applicable
            </div>
          )}
          <div
            className={`inline-block text-xs px-3 py-1.5 rounded-full border font-medium shadow-sm ${
              edu.isOngoing
                ? "bg-gradient-to-r from-blue-500/20 to-oceanic-500/20 text-blue-400 border-blue-500/30"
                : "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30"
            }`}
          >
            {edu.isOngoing ? "In Progress" : "Completed"}
          </div>
          {edu.universityLogo && (
            <div className="inline-flex items-center gap-2 bg-gray-700/30 text-gray-300 text-xs px-3 py-1.5 rounded-full border border-gray-600/50 font-medium shadow-sm">
              <img
                src={edu.universityLogo}
                alt={`${edu.institution} logo`}
                className="w-6 h-6 object-contain flex-shrink-0"
                loading="eager"
                decoding="async"
              />
              <span>
                {edu.initials ||
                  edu.institution
                    ?.split(" ")
                    .map((word: string) => word[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 4)}
              </span>
            </div>
          )}
          {edu.gpa && (
            <div className="inline-block bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 text-xs px-3 py-1.5 rounded-full border border-purple-500/30 font-medium shadow-sm">
              GPA: {edu.gpa}
            </div>
          )}
        </div>
        <p className="text-gray-300 text-sm leading-relaxed edu-description">
          {edu.description}
        </p>
      </div>
    </div>
  </div>
));

EducationCard.displayName = "EducationCard";
export default EducationCard;
