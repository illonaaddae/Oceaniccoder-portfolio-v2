import React, { useRef, useState } from "react";
import { FaGithub, FaExternalLinkAlt, FaPlay } from "react-icons/fa";
import { LazyImage } from "../ui/LazyImage";
import { getStatusColor } from "./projectsUtils";

const isYouTubeOrLoom = (url) => /youtube\.com|youtu\.be|loom\.com/.test(url);
const isDirectVideo = (url) => /\.(mp4|webm|ogg)(\?|$)/i.test(url);

const getDemoEmbedUrl = (url) => {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch)
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytMatch[1]}`;
  const loomMatch = url.match(/loom\.com\/share\/([\w-]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}?autoplay=1&hide_controls=1`;
  return null;
};

const ProjectCardImage = React.memo(({ project }) => {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef(null);
  const { demoVideoUrl } = project;

  const hasDirectVideo = demoVideoUrl && isDirectVideo(demoVideoUrl);
  const hasEmbedDemo = demoVideoUrl && isYouTubeOrLoom(demoVideoUrl);
  const embedUrl = hasEmbedDemo ? getDemoEmbedUrl(demoVideoUrl) : null;

  const handleMouseEnter = () => {
    setHovered(true);
    if (hasDirectVideo && videoRef.current) videoRef.current.play();
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
        <div className="absolute bottom-4 right-4 z-10">
          <span className="flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium border border-white/20">
            <FaPlay className="w-2.5 h-2.5" />
            Demo
          </span>
        </div>
      )}

      {project.featured && (
        <div className="absolute top-4 left-4">
          <span className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs px-3 py-1 rounded-full font-medium">
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
