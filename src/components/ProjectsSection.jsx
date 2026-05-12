import React from "react";
import { Helmet } from "react-helmet-async";
import useProjectsData from "./Projects/useProjectsData";
import SectionHeader from "./Projects/SectionHeader";
import CategoryFilter from "./Projects/CategoryFilter";
import ProjectGrid from "./Projects/ProjectGrid";
import CTASection from "./Projects/CTASection";

const ProjectsSection = () => {
  const {
    filteredProjects,
    visibleProjects,
    projectFilters,
    activeProjectFilter,
    handleFilterClick,
    loadMoreProjects,
  } = useProjectsData();

  return (
    <section
      id="projects"
      className="min-h-screen py-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      <Helmet>
        <title>Projects | OceanicCoder Portfolio</title>
        <meta
          name="description"
          content="Explore full-stack web and mobile projects built by Illona Addae — from e-commerce platforms to custom dashboards."
        />
        <meta property="og:title" content="Projects | OceanicCoder Portfolio" />
        <meta
          property="og:description"
          content="Explore full-stack web and mobile projects built by Illona Addae — from e-commerce platforms to custom dashboards."
        />
        <meta property="og:url" content="https://oceaniccoder.dev/projects" />
      </Helmet>
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-40 left-20 w-96 h-96 bg-gradient-to-r from-oceanic-500/8 to-blue-500/10 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-purple-500/6 to-pink-500/8 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <SectionHeader />
        <CategoryFilter
          filters={projectFilters}
          activeFilter={activeProjectFilter}
          onFilterClick={handleFilterClick}
        />
        <ProjectGrid
          projects={filteredProjects}
          visibleCount={visibleProjects}
          onLoadMore={loadMoreProjects}
        />
        <CTASection />
      </div>
    </section>
  );
};

export default ProjectsSection;
