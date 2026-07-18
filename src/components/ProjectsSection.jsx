import React from "react";
import { Helmet } from "react-helmet-async";
import useProjectsData from "./Projects/useProjectsData";
import SectionHeader from "./Projects/SectionHeader";
import CategoryFilter from "./Projects/CategoryFilter";
import ProjectGrid from "./Projects/ProjectGrid";
import CTASection from "./Projects/CTASection";

const ProjectsSection = () => {
  const { filteredProjects, projectFilters, activeProjectFilter, handleFilterClick } =
    useProjectsData();

  return (
    <section
      id="projects"
      className="min-h-screen pt-28 pb-20 relative scroll-mt-24 sm:scroll-mt-28"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      <Helmet>
        <title>Projects | OceanicCoder Portfolio</title>
        <meta
          name="description"
          content="Explore full-stack web and mobile projects built by Illona Addae, from e-commerce platforms to custom dashboards."
        />
        <meta property="og:title" content="Projects | OceanicCoder Portfolio" />
        <meta
          property="og:description"
          content="Explore full-stack web and mobile projects built by Illona Addae, from e-commerce platforms to custom dashboards."
        />
        <meta property="og:url" content="https://oceaniccoder.dev/projects" />
      </Helmet>
      <div className="container mx-auto px-6 relative z-10">
        <SectionHeader />
        <CategoryFilter
          filters={projectFilters}
          activeFilter={activeProjectFilter}
          onFilterClick={handleFilterClick}
        />
        <ProjectGrid projects={filteredProjects} />
        <CTASection />
      </div>
    </section>
  );
};

export default ProjectsSection;
