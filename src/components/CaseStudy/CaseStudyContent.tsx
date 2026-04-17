import React from "react";
import { FaLightbulb, FaRocket, FaCheckCircle } from "react-icons/fa";
import type { Project } from "../../types";

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  gradient: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  icon,
  title,
  gradient,
  children,
}) => (
  <div className="glass-card border border-[var(--glass-border)] rounded-2xl p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient}`}>
        {icon}
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
    </div>
    {children}
  </div>
);

const Text: React.FC<{ children: string }> = ({ children }) => (
  <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
    {children}
  </p>
);

interface Props {
  project: Project;
}

const CaseStudyContent: React.FC<Props> = React.memo(({ project }) => {
  const keyFeatures = project.keyFeatures || [];

  return (
    <div className="space-y-8">
      {project.challenge && (
        <Section
          icon={<FaLightbulb className="text-red-400" />}
          title="The Challenge"
          gradient="from-red-500/20 to-orange-500/20"
        >
          <Text>{project.challenge}</Text>
        </Section>
      )}
      {project.solution && (
        <Section
          icon={<FaRocket className="text-[var(--brand-ocean-2)]" />}
          title="The Solution"
          gradient="from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20"
        >
          <Text>{project.solution}</Text>
        </Section>
      )}
      {keyFeatures.length > 0 && (
        <Section
          icon={<FaCheckCircle className="text-purple-400" />}
          title="Key Features"
          gradient="from-purple-500/20 to-pink-500/20"
        >
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {keyFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <FaCheckCircle className="text-[var(--brand-ocean-2)] mt-1 flex-shrink-0" />
                <span className="text-[var(--text-secondary)]">{feature}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {project.results && (
        <Section
          icon={<FaCheckCircle className="text-green-400" />}
          title="Results & Impact"
          gradient="from-green-500/20 to-emerald-500/20"
        >
          <Text>{project.results}</Text>
        </Section>
      )}
      {project.lessonsLearned && (
        <Section
          icon={<FaLightbulb className="text-yellow-400" />}
          title="Lessons Learned"
          gradient="from-yellow-500/20 to-amber-500/20"
        >
          <Text>{project.lessonsLearned}</Text>
        </Section>
      )}
    </div>
  );
});

CaseStudyContent.displayName = "CaseStudyContent";
export default CaseStudyContent;
