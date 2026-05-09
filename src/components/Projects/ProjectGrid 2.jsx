import React from "react";
import ProjectCard from "./ProjectCard";

const ProjectGrid = React.memo(({ projects, visibleCount, onLoadMore }) => (
  <>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
      {projects.slice(0, visibleCount).map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>

    {visibleCount < projects.length && (
      <div className="text-center">
        <button
          onClick={onLoadMore}
          className="glass-btn bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white px-8 py-3 font-medium hover:scale-105 transition-transform duration-300"
        >
          Load More Projects
        </button>
      </div>
    )}
  </>
));

ProjectGrid.displayName = "ProjectGrid";

export default ProjectGrid;
