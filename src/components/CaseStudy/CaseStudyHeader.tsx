import React from "react";
import { FaCalendar, FaClock, FaUserTie, FaUsers } from "react-icons/fa";
import type { Project } from "../../types";

interface Props {
  project: Project;
}

const CaseStudyHeader: React.FC<Props> = React.memo(({ project }) => (
  <>
    {/* Category & Status */}
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <span className="px-3 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 text-sm font-medium rounded-full border border-orange-500/30">
        {project.category}
      </span>
      {project.status && (
        <span
          className={`px-3 py-1 text-sm font-medium rounded-full border ${
            project.status === "Completed"
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : project.status === "In Progress"
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
          }`}
        >
          {project.status}
        </span>
      )}
    </div>

    {/* Title */}
    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
      {project.title}
    </h1>

    {/* Description */}
    <p className="text-lg text-[var(--text-secondary)] mb-6 leading-relaxed">
      {project.longDescription || project.description}
    </p>

    {/* Meta info */}
    <div className="flex flex-wrap items-center gap-4 md:gap-6 text-[var(--text-accent)] mb-6">
      {project.year && (
        <span className="flex items-center gap-2">
          <FaCalendar className="text-[var(--brand-ocean-2)]" />
          {project.year}
        </span>
      )}
      {project.timeline && (
        <span className="flex items-center gap-2">
          <FaClock className="text-[var(--brand-ocean-2)]" />
          {project.timeline}
        </span>
      )}
      {project.role && (
        <span className="flex items-center gap-2">
          <FaUserTie className="text-[var(--brand-ocean-2)]" />
          {project.role}
        </span>
      )}
      {project.teamSize && (
        <span className="flex items-center gap-2">
          <FaUsers className="text-[var(--brand-ocean-2)]" />
          {project.teamSize}
        </span>
      )}
    </div>
  </>
));

CaseStudyHeader.displayName = "CaseStudyHeader";
export default CaseStudyHeader;
