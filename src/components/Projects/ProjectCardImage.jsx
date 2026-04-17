import React from "react";
import { FaGithub, FaExternalLinkAlt } from "react-icons/fa";
import { LazyImage } from "../ui/LazyImage";
import { getStatusColor } from "./projectsUtils";

const ProjectCardImage = React.memo(({ project }) => (
  <div className="relative overflow-hidden h-48">
    <LazyImage
      src={project.image}
      alt={project.title}
      className="w-full h-full group-hover:scale-110 transition-transform duration-500"
      placeholderColor="from-slate-800 to-slate-900"
      displaySize="card"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div className="absolute bottom-4 left-4 right-4 flex gap-2">
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="glass-btn p-2 text-white hover:text-oceanic-500 transition-colors duration-300 z-10"
          >
            <FaGithub className="w-5 h-5" />
          </a>
        )}
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="glass-btn p-2 text-white hover:text-oceanic-500 transition-colors duration-300 z-10"
          >
            <FaExternalLinkAlt className="w-5 h-5" />
          </a>
        )}
      </div>
    </div>

    {project.featured && (
      <div className="absolute top-4 left-4">
        <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium">
          Featured
        </span>
      </div>
    )}

    <div className="absolute top-4 right-4">
      <span
        className={`text-xs px-3 py-1 rounded-full font-medium border ${getStatusColor(
          project.status,
        )}`}
      >
        {project.status}
      </span>
    </div>
  </div>
));

ProjectCardImage.displayName = "ProjectCardImage";

export default ProjectCardImage;
