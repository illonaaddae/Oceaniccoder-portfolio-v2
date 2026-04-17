import { useState, useEffect } from "react";
import { usePortfolio } from "../../Context";

const useProjectsData = () => {
  const {
    projects,
    projectFilters,
    activeProjectFilter,
    setActiveProjectFilter,
  } = usePortfolio();
  const [filteredProjects, setFilteredProjects] = useState(projects);
  const [visibleProjects, setVisibleProjects] = useState(6);

  useEffect(() => {
    if (activeProjectFilter === "All") {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(
        projects.filter((project) => project.category === activeProjectFilter),
      );
    }
  }, [activeProjectFilter, projects]);

  const handleFilterClick = (filter) => {
    setActiveProjectFilter(filter);
    setVisibleProjects(6);
  };

  const loadMoreProjects = () => {
    setVisibleProjects((prev) => prev + 6);
  };

  return {
    filteredProjects,
    visibleProjects,
    projectFilters,
    activeProjectFilter,
    handleFilterClick,
    loadMoreProjects,
  };
};

export default useProjectsData;
