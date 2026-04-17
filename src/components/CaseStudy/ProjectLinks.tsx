import React from "react";
import { FaExternalLinkAlt, FaGithub } from "react-icons/fa";

interface Props {
  liveUrl?: string;
  githubUrl?: string;
}

const ProjectLinks: React.FC<Props> = React.memo(({ liveUrl, githubUrl }) => {
  if (!liveUrl && !githubUrl) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {liveUrl && (
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[var(--brand-ocean-2)] to-[var(--brand-ocean-3)] text-white font-medium rounded-xl hover:from-[var(--brand-ocean-3)] hover:to-[var(--brand-ocean-4)] transition-all shadow-lg shadow-[var(--shadow-ocean)]"
        >
          <FaExternalLinkAlt /> View Live
        </a>
      )}
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 glass-card border border-[var(--glass-border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--glass-bg)] transition-all"
        >
          <FaGithub /> View Code
        </a>
      )}
    </div>
  );
});

ProjectLinks.displayName = "ProjectLinks";
export default ProjectLinks;
