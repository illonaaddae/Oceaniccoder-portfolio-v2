import React, { useCallback } from "react";
import ProjectCard from "./ProjectCard";
import { Pagination } from "@/components/common/Pagination";
import { usePagination } from "@/hooks/usePagination";

const PAGE_SIZE = 9; // clean 3×3 grid on desktop

const ProjectGrid = React.memo(({ projects }) => {
  const { page, setPage, pageItems, totalItems } = usePagination(projects, PAGE_SIZE);

  // Jump back to the top of the section when the visitor pages through.
  //
  // This deliberately hangs off the pagination click rather than off a
  // `useEffect` watching `page`. As an effect it also fired whenever the grid
  // mounted — and on "/" the grid is one of four stacked sections that mounts
  // late, once the project data resolves. The result was that landing on the
  // home page (or clicking Home from anywhere) silently scrolled the visitor
  // past the hero and down into the projects list a second after load.
  const handlePageChange = useCallback(
    (next) => {
      setPage(next);
      if (typeof window !== "undefined")
        document.getElementById("projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [setPage],
  );

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-4">
        {pageItems.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <Pagination
        page={page}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
      />
    </>
  );
});

ProjectGrid.displayName = "ProjectGrid";

export default ProjectGrid;
