import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { LazyImage } from "./ui/LazyImage";
import {
  useCaseStudy,
  CaseStudyLoading,
  CaseStudyNotFound,
  CaseStudyHeader,
  ProjectLinks,
  TechStack,
  CaseStudyContent,
  Screenshots,
  NavigationButtons,
  RelatedProjects,
} from "./CaseStudy";

const ProjectCaseStudy: React.FC = () => {
  const navigate = useNavigate();
  const { project, loading, prevProject, nextProject, relatedProjects } =
    useCaseStudy();

  if (loading) return <CaseStudyLoading />;
  if (!project) return <CaseStudyNotFound />;

  return (
    <section
      className="min-h-screen pt-28 pb-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
      }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-20 right-10 w-96 h-96 bg-gradient-to-r from-orange-500/8 to-red-500/10 blur-3xl" />
        <div className="liquid-morph absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-r from-oceanic-500/6 to-blue-500/8 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-5xl">
        {/* Back button */}
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 text-[var(--text-accent)] hover:text-[var(--text-primary)] mb-8 transition-colors"
        >
          <FaArrowLeft /> Back to Projects
        </button>

        {/* Hero Section */}
        <header className="mb-12">
          <CaseStudyHeader project={project} />
          <ProjectLinks
            liveUrl={project.liveUrl}
            githubUrl={project.githubUrl}
          />
        </header>

        {/* Featured Image */}
        {project.image && (
          <div className="mb-12 rounded-2xl overflow-hidden border border-[var(--glass-border)]">
            <LazyImage
              src={project.image}
              alt={`${project.title} preview`}
              className="w-full h-auto"
              displaySize="hero"
            />
          </div>
        )}

        <TechStack technologies={project.technologies} />
        <CaseStudyContent project={project} />
        <Screenshots
          screenshots={project.screenshots || []}
          title={project.title}
        />
        <NavigationButtons
          prevProject={prevProject}
          nextProject={nextProject}
        />
        <RelatedProjects projects={relatedProjects} />
      </div>
    </section>
  );
};

export default ProjectCaseStudy;
