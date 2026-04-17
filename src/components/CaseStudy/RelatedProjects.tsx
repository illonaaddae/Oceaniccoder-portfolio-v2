import React from "react";
import { Link } from "react-router-dom";
import { LazyImage } from "../ui/LazyImage";
import type { Project } from "../../types";
import { getProjectSlug } from "./useCaseStudy";

interface Props {
  projects: Project[];
}

const RelatedProjects: React.FC<Props> = React.memo(({ projects }) => {
  if (projects.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        Related Projects
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((rp) => (
          <Link
            key={rp.$id}
            to={`/projects/${getProjectSlug(rp)}`}
            className="glass-card border border-[var(--glass-border)] rounded-xl overflow-hidden hover:border-[var(--brand-ocean-2)]/50 transition-all hover:scale-[1.02] group"
          >
            {rp.image && (
              <div className="h-40 overflow-hidden">
                <LazyImage
                  src={rp.image}
                  alt={rp.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4">
              <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-ocean-2)] transition-colors line-clamp-1">
                {rp.title}
              </h4>
              <p className="text-sm text-[var(--text-accent)] line-clamp-2 mt-1">
                {rp.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

RelatedProjects.displayName = "RelatedProjects";
export default RelatedProjects;
