import React, { useEffect } from "react";
import ProjectCard from "./ProjectCard";
import { Pagination } from "@/components/common/Pagination";
import { usePagination } from "@/hooks/usePagination";

const PAGE_SIZE = 9; // clean 3×3 grid on desktop

const ProjectGrid = React.memo(({ projects }) => {
  const { page, setPage, pageItems, totalItems } = usePagination(projects, PAGE_SIZE);

  // Jump back to the top of the section when the page changes.
  useEffect(() => {
    if (typeof window !== "undefined")
      document.getElementById("projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-4">
        {pageItems.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <Pagination page={page} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </>
  );
});

ProjectGrid.displayName = "ProjectGrid";

export default ProjectGrid;
