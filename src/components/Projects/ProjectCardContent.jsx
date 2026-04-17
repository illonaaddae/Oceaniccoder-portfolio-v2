import React from "react";
import { FaCalendar, FaCode, FaEye, FaArrowRight } from "react-icons/fa";

const ProjectCardContent = React.memo(({ project }) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-oceanic-500 font-medium">
        {project.category}
      </span>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <FaCalendar className="w-3 h-3" />
        {project.year}
      </div>
    </div>

    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-oceanic-500 transition-colors duration-300">
      {project.title}
    </h3>

    <p className="text-gray-300 text-sm mb-4 leading-relaxed">
      {project.description}
    </p>

    <div className="flex flex-wrap gap-2 mb-4">
      {project.technologies.slice(0, 3).map((tech, index) => (
        <span
          key={index}
          className="text-xs bg-gradient-to-r from-oceanic-500/20 to-oceanic-900/20 text-oceanic-500 px-2 py-1 rounded border border-oceanic-500/30"
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

    <div className="flex gap-3 mb-3">
      {project.liveUrl && (
        <a
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 glass-btn bg-oceanic-600 hover:bg-oceanic-700 text-white py-2 px-4 text-sm font-medium text-center hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 z-10 shadow-lg hover:shadow-oceanic-500/30"
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
          onClick={(e) => e.stopPropagation()}
          className="flex-1 glass-btn proj-card-code-btn py-2 px-4 text-sm font-medium text-center hover:scale-105 transition-transform duration-300 flex items-center justify-center gap-2 z-10"
        >
          <FaCode className="w-4 h-4" />
          Code
        </a>
      )}
    </div>

    <div className="flex items-center justify-center gap-2 text-sm proj-case-study-link text-orange-400 group-hover:brightness-125 transition-all py-2">
      View Case Study
      <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
    </div>
  </div>
));

ProjectCardContent.displayName = "ProjectCardContent";

export default ProjectCardContent;
