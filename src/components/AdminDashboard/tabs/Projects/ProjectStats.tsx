import { FaProjectDiagram, FaCheckCircle, FaClock } from "react-icons/fa";
import type { Project } from "@/types";

interface ProjectStatsProps {
  theme: "light" | "dark";
  projects: Project[];
}

const cardClass = (_theme: "light" | "dark") => "glass-card card-hover p-4 sm:p-6";

const labelClass = (theme: "light" | "dark") =>
  `text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
    theme === "dark" ? "text-slate-100/95" : "text-slate-700/80"
  }`;

const valueClass = (theme: "light" | "dark") =>
  `text-4xl font-bold mt-2 transition-colors duration-300 ${
    theme === "dark" ? "text-white/98" : "text-slate-900"
  }`;

export const ProjectStats: React.FC<ProjectStatsProps> = ({ theme, projects }) => {
  const published = projects.filter((p) => p.status === "published" || p.featured).length;
  const drafts = projects.filter((p) => p.status === "draft").length;

  const stats = [
    {
      label: "Total Projects",
      value: projects.length,
      icon: FaProjectDiagram,
      gradient: "from-oceanic-500 to-oceanic-900",
    },
    {
      label: "Published",
      value: published,
      icon: FaCheckCircle,
      gradient: "from-success-500 to-success-700",
    },
    {
      label: "Drafts",
      value: drafts,
      icon: FaClock,
      gradient: "from-warning-500 to-warning-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
      {stats.map(({ label, value, icon: Icon, gradient }) => (
        <div key={label} className={cardClass(theme)}>
          <div className="flex items-start justify-between">
            <div>
              <p className={labelClass(theme)}>{label}</p>
              <p className={valueClass(theme)}>{value}</p>
            </div>
            <div
              className={`p-3 rounded-xl backdrop-blur-md bg-gradient-to-br ${gradient} shadow-lg`}
            >
              <Icon className="text-white text-xl font-bold" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
