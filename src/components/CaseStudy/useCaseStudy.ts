import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePortfolioData } from "../../hooks/usePortfolioData";
import type { Project } from "../../types";

/** Derive a URL-safe slug from a project. */
export const getProjectSlug = (p: Project): string =>
  p.slug || p.title.toLowerCase().replace(/\s+/g, "-");

/** Fetch current project by slug/id and compute navigation helpers. */
export function useCaseStudy() {
  const { slug } = useParams<{ slug: string }>();
  const { projects, loading } = usePortfolioData();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (projects.length > 0 && slug) {
      const found = projects.find(
        (p) =>
          p.slug === slug ||
          p.$id === slug ||
          p.title.toLowerCase().replace(/\s+/g, "-") === slug,
      );
      setProject(found || null);
    }
  }, [projects, slug]);

  const relatedProjects = projects
    .filter((p) => p.$id !== project?.$id && p.category === project?.category)
    .slice(0, 3);

  const currentIndex = projects.findIndex((p) => p.$id === project?.$id);
  const prevProject = currentIndex > 0 ? projects[currentIndex - 1] : null;
  const nextProject =
    currentIndex < projects.length - 1 ? projects[currentIndex + 1] : null;

  return { project, loading, prevProject, nextProject, relatedProjects };
}
