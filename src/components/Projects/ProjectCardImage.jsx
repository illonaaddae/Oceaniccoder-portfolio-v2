import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaGithub, FaExternalLinkAlt, FaPlay } from "react-icons/fa";
import { LazyImage } from "../ui/LazyImage";
import { getProjectSlug, getStatusColor } from "./projectsUtils";
import { getVideoEmbedUrl, isDirectVideoUrl, isEmbedVideoUrl } from "@/utils/videoUrl";

const ProjectCardImage = React.memo(({ project }) => {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const { demoVideoUrl } = project;

  const hasDirectVideo = demoVideoUrl && isDirectVideoUrl(demoVideoUrl);
  const hasEmbedDemo = demoVideoUrl && isEmbedVideoUrl(demoVideoUrl);
  const embedUrl = hasEmbedDemo ? getVideoEmbedUrl(demoVideoUrl, { preview: true }) : null;

  // Touch screens never hover, so the badge is the way to the full player.
  const openDemo = (e) => {
    e.stopPropagation();
    navigate(`/projects/${getProjectSlug(project)}#demo`);
  };

  const handleMouseEnter = () => {
    setHovered(true);
    // play() rejects if the user leaves before enough has buffered; that is fine.
    if (hasDirectVideo && videoRef.current) videoRef.current.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (hasDirectVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="relative overflow-hidden h-48"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Static thumbnail */}
      <LazyImage
        src={project.image}
        alt={project.title}
        className={`w-full h-full transition-all duration-500 ${hovered && (hasDirectVideo || hasEmbedDemo) ? "scale-110 opacity-0" : "group-hover:scale-110"}`}
        placeholderColor="from-slate-800 to-slate-900"
        displaySize="card"
      />

      {/* Direct MP4 video overlay */}
      {hasDirectVideo && (
        <video
          ref={videoRef}
          src={demoVideoUrl}
          muted
          loop
          playsInline
          preload="none"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {/* YouTube / Loom iframe overlay */}
      {hasEmbedDemo && embedUrl && hovered && (
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen"
          title={`${project.title} demo`}
        />
      )}

      {/* Hover action buttons */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="glass-btn p-2 text-white hover:text-oceanic-500 transition-colors duration-300 z-10"
              aria-label={`View ${project.title} on GitHub`}
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
              aria-label={`View ${project.title} live demo`}
            >
              <FaExternalLinkAlt className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>

      {/* Demo badge */}
      {demoVideoUrl && (
        <button
          type="button"
          onClick={openDemo}
          onKeyDown={(e) => e.stopPropagation()}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-gradient-to-r from-oceanic-500 to-oceanic-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg shadow-oceanic-900/30 hover:from-oceanic-400 hover:to-oceanic-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 transition-colors duration-300"
          aria-label={`Watch the ${project.title} demo video`}
        >
          <FaPlay className="w-2.5 h-2.5" aria-hidden="true" />
          Demo
        </button>
      )}

      {project.featured && (
        <div className="absolute top-4 left-4">
          <span className="bg-gradient-to-r from-oceanic-500 to-oceanic-600 text-white text-xs px-3 py-1 rounded-full font-medium">
            Featured
          </span>
        </div>
      )}

      <div className="absolute top-4 right-4">
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium border ${getStatusColor(project.status)}`}
        >
          {project.status}
        </span>
      </div>
    </div>
  );
});

ProjectCardImage.displayName = "ProjectCardImage";

export default ProjectCardImage;
