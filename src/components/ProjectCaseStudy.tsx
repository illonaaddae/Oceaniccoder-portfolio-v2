import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaGithub,
  FaExternalLinkAlt,
  FaCalendar,
  FaUsers,
  FaClock,
  FaCheckCircle,
  FaLightbulb,
  FaRocket,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaCode,
  FaUserTie,
} from "react-icons/fa";
import { usePortfolioData } from "../hooks/usePortfolioData";
import { LazyImage } from "./ui/LazyImage";
import type { Project } from "../types";

const ProjectCaseStudy: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { projects, loading } = usePortfolioData();
  const [project, setProject] = useState<Project | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Find project by slug or id
  useEffect(() => {
    if (projects.length > 0 && slug) {
      const found = projects.find(
        (p) =>
          p.slug === slug ||
          p.$id === slug ||
          p.title.toLowerCase().replace(/\s+/g, "-") === slug
      );
      setProject(found || null);
    }
  }, [projects, slug]);

  // Related projects (same category)
  const relatedProjects = projects
    .filter((p) => p.$id !== project?.$id && p.category === project?.category)
    .slice(0, 3);

  // Navigation to next/prev projects
  const currentIndex = projects.findIndex((p) => p.$id === project?.$id);
  const prevProject = currentIndex > 0 ? projects[currentIndex - 1] : null;
  const nextProject =
    currentIndex < projects.length - 1 ? projects[currentIndex + 1] : null;

  // Get project slug for navigation
  const getProjectSlug = (p: Project) =>
    p.slug || p.title.toLowerCase().replace(/\s+/g, "-");

  // Lightbox navigation
  const screenshots = project?.screenshots || [];
  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxImage(screenshots[index]);
  };
  const closeLightbox = () => setLightboxImage(null);
  const nextImage = () => {
    const next = (currentImageIndex + 1) % screenshots.length;
    setCurrentImageIndex(next);
    setLightboxImage(screenshots[next]);
  };
  const prevImage = () => {
    const prev =
      (currentImageIndex - 1 + screenshots.length) % screenshots.length;
    setCurrentImageIndex(prev);
    setLightboxImage(screenshots[prev]);
  };

  // Format key features
  const keyFeatures = project?.keyFeatures || [];

  // Loading state
  if (loading) {
    return (
      <section className="min-h-screen pt-28 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--brand-ocean-2)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-accent)]">Loading project...</p>
        </div>
      </section>
    );
  }

  // Not found state
  if (!project) {
    return (
      <section
        className="min-h-screen pt-28 pb-20"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
            Project Not Found
          </h1>
          <p className="text-[var(--text-accent)] mb-8">
            The project you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/projects"
            className="px-6 py-3 bg-gradient-to-r from-[var(--brand-ocean-2)] to-[var(--brand-ocean-3)] text-white rounded-lg font-medium hover:from-[var(--brand-ocean-3)] hover:to-[var(--brand-ocean-4)] transition-all inline-flex items-center gap-2"
          >
            <FaArrowLeft /> Back to Projects
          </Link>
        </div>
      </section>
    );
  }

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
        <div className="liquid-morph absolute top-20 right-10 w-96 h-96 bg-gradient-to-r from-orange-500/8 to-red-500/10 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-r from-cyan-500/6 to-blue-500/8 blur-3xl"></div>
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
          {/* Category & Status */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 text-sm font-medium rounded-full border border-orange-500/30">
              {project.category}
            </span>
            {project.status && (
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full border ${
                  project.status === "Completed"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : project.status === "In Progress"
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                }`}
              >
                {project.status}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
            {project.title}
          </h1>

          {/* Description */}
          <p className="text-lg text-[var(--text-secondary)] mb-6 leading-relaxed">
            {project.longDescription || project.description}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-[var(--text-accent)] mb-6">
            {project.year && (
              <span className="flex items-center gap-2">
                <FaCalendar className="text-[var(--brand-ocean-2)]" />
                {project.year}
              </span>
            )}
            {project.timeline && (
              <span className="flex items-center gap-2">
                <FaClock className="text-[var(--brand-ocean-2)]" />
                {project.timeline}
              </span>
            )}
            {project.role && (
              <span className="flex items-center gap-2">
                <FaUserTie className="text-[var(--brand-ocean-2)]" />
                {project.role}
              </span>
            )}
            {project.teamSize && (
              <span className="flex items-center gap-2">
                <FaUsers className="text-[var(--brand-ocean-2)]" />
                {project.teamSize}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[var(--brand-ocean-2)] to-[var(--brand-ocean-3)] text-white font-medium rounded-xl hover:from-[var(--brand-ocean-3)] hover:to-[var(--brand-ocean-4)] transition-all shadow-lg shadow-[var(--shadow-ocean)]"
              >
                <FaExternalLinkAlt /> View Live
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 glass-card border border-[var(--glass-border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--glass-bg)] transition-all"
              >
                <FaGithub /> View Code
              </a>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {project.image && (
          <div className="mb-12 rounded-2xl overflow-hidden border border-[var(--glass-border)]">
            <LazyImage
              src={project.image}
              alt={`${project.title} preview`}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Technologies */}
        <div className="glass-card border border-[var(--glass-border)] rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20">
              <FaCode className="text-[var(--brand-ocean-2)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Technologies Used
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((tech, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Case Study Sections */}
        <div className="space-y-8">
          {/* The Challenge */}
          {project.challenge && (
            <div className="glass-card border border-[var(--glass-border)] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20">
                  <FaLightbulb className="text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  The Challenge
                </h2>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {project.challenge}
              </p>
            </div>
          )}

          {/* The Solution */}
          {project.solution && (
            <div className="glass-card border border-[var(--glass-border)] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20">
                  <FaRocket className="text-[var(--brand-ocean-2)]" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  The Solution
                </h2>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {project.solution}
              </p>
            </div>
          )}

          {/* Key Features */}
          {keyFeatures.length > 0 && (
            <div className="glass-card border border-[var(--glass-border)] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <FaCheckCircle className="text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Key Features
                </h2>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {keyFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <FaCheckCircle className="text-[var(--brand-ocean-2)] mt-1 flex-shrink-0" />
                    <span className="text-[var(--text-secondary)]">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Results */}
          {project.results && (
            <div className="glass-card border border-[var(--glass-border)] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                  <FaCheckCircle className="text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Results & Impact
                </h2>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {project.results}
              </p>
            </div>
          )}

          {/* Lessons Learned */}
          {project.lessonsLearned && (
            <div className="glass-card border border-[var(--glass-border)] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20">
                  <FaLightbulb className="text-yellow-400" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Lessons Learned
                </h2>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {project.lessonsLearned}
              </p>
            </div>
          )}
        </div>

        {/* Screenshots Gallery */}
        {screenshots.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
              Screenshots
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {screenshots.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => openLightbox(idx)}
                  className="rounded-xl overflow-hidden border border-[var(--glass-border)] hover:border-[var(--brand-ocean-2)]/50 transition-all hover:scale-[1.02]"
                  aria-label={`View screenshot ${idx + 1} of ${project.title}`}
                >
                  <LazyImage
                    src={src}
                    alt={`${project.title} screenshot ${idx + 1}`}
                    className="w-full h-48 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Close lightbox"
            >
              <FaTimes className="text-2xl" />
            </button>
            {screenshots.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 p-3 text-white/70 hover:text-white transition-colors"
                  aria-label="Previous image"
                >
                  <FaChevronLeft className="text-2xl" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 p-3 text-white/70 hover:text-white transition-colors"
                  aria-label="Next image"
                >
                  <FaChevronRight className="text-2xl" />
                </button>
              </>
            )}
            <img
              src={lightboxImage}
              alt="Screenshot"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 text-white/70 text-sm">
              {currentImageIndex + 1} / {screenshots.length}
            </div>
          </div>
        )}

        {/* Project Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 mt-16 mb-12">
          {prevProject ? (
            <Link
              to={`/projects/${getProjectSlug(prevProject)}`}
              className="flex-1 glass-card border border-[var(--glass-border)] p-4 rounded-xl hover:bg-[var(--glass-bg)] transition-colors group"
            >
              <div className="flex items-center gap-2 text-[var(--text-accent)] text-sm mb-2">
                <FaChevronLeft /> Previous Project
              </div>
              <h4 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--brand-ocean-2)] transition-colors line-clamp-1">
                {prevProject.title}
              </h4>
            </Link>
          ) : (
            <div className="flex-1"></div>
          )}

          {nextProject ? (
            <Link
              to={`/projects/${getProjectSlug(nextProject)}`}
              className="flex-1 glass-card border border-[var(--glass-border)] p-4 rounded-xl hover:bg-[var(--glass-bg)] transition-colors group text-right"
            >
              <div className="flex items-center justify-end gap-2 text-[var(--text-accent)] text-sm mb-2">
                Next Project <FaChevronRight />
              </div>
              <h4 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--brand-ocean-2)] transition-colors line-clamp-1">
                {nextProject.title}
              </h4>
            </Link>
          ) : (
            <div className="flex-1"></div>
          )}
        </div>

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
              Related Projects
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProjects.map((relatedProject) => (
                <Link
                  key={relatedProject.$id}
                  to={`/projects/${getProjectSlug(relatedProject)}`}
                  className="glass-card border border-[var(--glass-border)] rounded-xl overflow-hidden hover:border-[var(--brand-ocean-2)]/50 transition-all hover:scale-[1.02] group"
                >
                  {relatedProject.image && (
                    <div className="h-40 overflow-hidden">
                      <LazyImage
                        src={relatedProject.image}
                        alt={relatedProject.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-ocean-2)] transition-colors line-clamp-1">
                      {relatedProject.title}
                    </h4>
                    <p className="text-sm text-[var(--text-accent)] line-clamp-2 mt-1">
                      {relatedProject.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectCaseStudy;
