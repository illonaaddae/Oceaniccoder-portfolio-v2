import React, { useState, useEffect } from "react";
import {
  FaGithub,
  FaExternalLinkAlt,
  FaCalendar,
  FaCode,
  FaEye,
} from "react-icons/fa";
import { usePortfolio } from "../Context"; // Fixed path

const ProjectsSection = () => {
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
        projects.filter((project) => project.category === activeProjectFilter)
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

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "text-green-400 bg-green-400/10 border-green-400/30";
      case "In Progress":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
      case "Planning":
        return "text-blue-400 bg-blue-400/10 border-blue-400/30";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/30";
    }
  };

  return (
    <section
      id="projects"
      className="min-h-screen py-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 50%, var(--bg-secondary) 100%)",
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-40 left-20 w-96 h-96 bg-gradient-to-r from-cyan-500/8 to-blue-500/10 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-purple-500/6 to-pink-500/8 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 dark:from-orange-400 dark:via-red-400 dark:to-pink-400 bg-clip-text text-transparent">
              Featured Projects
            </span>
          </h2>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
            A showcase of my technical expertise and creative problem-solving
            abilities
          </p>
        </div>

        {/* Project Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {projectFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterClick(filter)}
              className={`glass-btn px-6 py-3 font-medium transition-all duration-300 ${
                activeProjectFilter === filter
                  ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30 scale-105"
                  : "text-gray-400 hover:text-white hover:bg-white/5 hover:scale-105"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {filteredProjects.slice(0, visibleProjects).map((project) => (
            <div key={project.id} className="card-hover group">
              <div className="glass-card overflow-hidden h-full">
                {/* Project Image */}
                <div className="relative overflow-hidden">
                  <img
                    loading="lazy"
                    decoding="async"
                    width="1200"
                    height="630"
                    src={project.image}
                    alt={project.title}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      if (!e.currentTarget.dataset.fallback) {
                        e.currentTarget.dataset.fallback = "1";
                        e.currentTarget.src = "/images/blog-placeholder-1.svg";
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-btn p-2 text-white hover:text-cyan-400 transition-colors duration-300"
                        >
                          <FaGithub className="w-5 h-5" />
                        </a>
                      )}
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-btn p-2 text-white hover:text-cyan-400 transition-colors duration-300"
                        >
                          <FaExternalLinkAlt className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Featured Badge */}
                  {project.featured && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        Featured
                      </span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium border ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {project.status}
                    </span>
                  </div>
                </div>

                {/* Project Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-cyan-400 font-medium">
                      {project.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FaCalendar className="w-3 h-3" />
                      {project.year}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors duration-300">
                    {project.title}
                  </h3>

                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Technologies */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.slice(0, 3).map((tech, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 px-2 py-1 rounded border border-cyan-500/30"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="text-xs text-gray-400 px-2 py-1">
                        +{project.technologies.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 glass-btn bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-2 px-4 text-sm font-medium text-center hover:scale-105 transition-transform duration-300 flex items-center justify-center gap-2"
                      >
                        <FaEye className="w-4 h-4" />
                        Live Demo
                      </a>
                    )}
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 glass-btn border border-white/20 text-white py-2 px-4 text-sm font-medium text-center hover:scale-105 transition-transform duration-300 flex items-center justify-center gap-2"
                      >
                        <FaCode className="w-4 h-4" />
                        Code
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {visibleProjects < filteredProjects.length && (
          <div className="text-center">
            <button
              onClick={loadMoreProjects}
              className="glass-btn bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-3 font-medium hover:scale-105 transition-transform duration-300"
            >
              Load More Projects
            </button>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="glass-card p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Like What You See?
            </h3>
            <p className="text-gray-300 mb-6">
              I'm always excited to work on new projects and collaborate with
              amazing teams. Let's build something incredible together!
            </p>
            <button
              onClick={() =>
                document
                  .getElementById("contact")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="glass-btn bg-gradient-to-r from-cyan-900 to-blue-900 text-white px-8 py-3 font-medium hover:scale-105 transition-transform duration-300"
            >
              Let's Connect
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
