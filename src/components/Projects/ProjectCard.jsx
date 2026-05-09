import React from "react";
import { useNavigate } from "react-router-dom";
import ProjectCardImage from "./ProjectCardImage";
import ProjectCardContent from "./ProjectCardContent";
import { getProjectSlug } from "./projectsUtils";

const ProjectCard = React.memo(({ project }) => {
  const navigate = useNavigate();
  const slug = getProjectSlug(project);

  const handleNavigate = () => navigate(`/projects/${slug}`);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleNavigate();
    }
  };

  return (
    <div
      onClick={handleNavigate}
      className="card-hover group block cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="glass-card overflow-hidden h-full border border-[var(--glass-border)] hover:border-oceanic-500/50 transition-colors duration-300">
        <ProjectCardImage project={project} />
        <ProjectCardContent project={project} />
      </div>
    </div>
  );
});

ProjectCard.displayName = "ProjectCard";

export default ProjectCard;
