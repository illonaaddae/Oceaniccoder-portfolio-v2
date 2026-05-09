import { FaProjectDiagram, FaCheckCircle, FaClock } from "react-icons/fa";
import type { Project } from "@/types";

interface ProjectStatsProps {
  theme: "light" | "dark";
  projects: Project[];
}

const cardClass = (theme: "light" | "dark") =>
  `glass-card border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-200 ${
    theme === "dark"
      ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
      : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40 hover:border-blue-200/60 hover:bg-gradient-to-br hover:from-white/50 hover:to-white/30"
  }`;

const labelClass = (theme: "light" | "dark") =>
  `text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
    theme === "dark" ? "text-slate-100/95" : "text-slate-700/80"
  }`;

const valueClass = (theme: "light" | "dark") =>
  `text-4xl font-bold mt-2 transition-colors duration-300 ${
    theme === "dark" ? "text-white/98" : "text-slate-900"
  }`;

export const ProjectStats: React.FC<ProjectStatsProps> = ({
  theme,
  projects,
}) => {
  const published = projects.filter(
    (p) => p.status === "published" || p.featured,
  ).length;
  const drafts = projects.filter((p) => p.status === "draft").length;

  const stats = [
    {
      label: "Total Projects",
      value: projects.length,
      icon: FaProjectDiagram,
      gradient: "from-blue-600 to-oceanic-900",
    },
    {
      label: "Published",
      value: published,
      icon: FaCheckCircle,
      gradient: "from-green-600 to-green-500",
    },
    {
      label: "Drafts",
      value: drafts,
      icon: FaClock,
      gradient: "from-orange-600 to-orange-500",
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
