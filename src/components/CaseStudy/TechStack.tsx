import React from "react";
import { FaCode } from "react-icons/fa";

interface Props {
  technologies: string[];
}

const TechStack: React.FC<Props> = React.memo(({ technologies }) => (
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
      {technologies.map((tech, idx) => (
        <span
          key={idx}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)]"
        >
          {tech}
        </span>
      ))}
    </div>
  </div>
));

TechStack.displayName = "TechStack";
export default TechStack;
