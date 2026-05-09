import React from "react";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { Project } from "../../types";
import { getProjectSlug } from "./useCaseStudy";

interface Props {
  prevProject: Project | null;
  nextProject: Project | null;
}

const NavigationButtons: React.FC<Props> = React.memo(
  ({ prevProject, nextProject }) => (
    <div className="flex flex-col sm:flex-row gap-4 mt-16 mb-12">
      {prevProject ? (
        <Link
          to={`/projects/${getProjectSlug(prevProject)}`}
          className="flex-1 glass-card border border-[var(--glass-border)] p-4 rounded-xl hover:bg-[var(--glass-bg)] transition-colors group"
        >
          <div className="flex items-center gap-2 text-[var(--text-accent)] text-sm mb-2">
            <FaChevronLeft /> Previous Project
          </div>
          <h4 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--brand-ocean-2)] transition-colors line-clamp-1">
            {prevProject.title}
          </h4>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {nextProject ? (
        <Link
          to={`/projects/${getProjectSlug(nextProject)}`}
          className="flex-1 glass-card border border-[var(--glass-border)] p-4 rounded-xl hover:bg-[var(--glass-bg)] transition-colors group text-right"
        >
          <div className="flex items-center justify-end gap-2 text-[var(--text-accent)] text-sm mb-2">
            Next Project <FaChevronRight />
          </div>
          <h4 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--brand-ocean-2)] transition-colors line-clamp-1">
            {nextProject.title}
          </h4>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  ),
);

NavigationButtons.displayName = "NavigationButtons";
export default NavigationButtons;
