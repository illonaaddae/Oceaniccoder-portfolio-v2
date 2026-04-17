import { FaFolder } from "react-icons/fa";
import type { Project } from "@/types";
import { formatRelativeTime } from "@/utils/formatters";

interface ProjectRowProps {
  project: Project;
  theme: "light" | "dark";
}

export const ProjectRow: React.FC<ProjectRowProps> = ({ project, theme }) => (
  <tr
    className={`border-b transition-colors duration-300 ${
      theme === "dark"
        ? "border-white/5 hover:bg-white/5"
        : "border-blue-200/20 hover:bg-white/20"
    }`}
  >
    <td className="px-3 sm:px-4 py-2 sm:py-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-500/30 flex items-center justify-center flex-shrink-0">
          <FaFolder className="text-blue-400 text-[10px] sm:text-xs" />
        </div>
        <span
          className={`font-medium transition-colors duration-300 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none ${
            theme === "dark" ? "text-white/95" : "text-slate-900"
          }`}
        >
          {project.title}
        </span>
      </div>
    </td>
    <td
      className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden sm:table-cell ${
        theme === "dark" ? "text-slate-200/90" : "text-slate-700"
      }`}
    >
      Project
    </td>
    <td className="px-3 sm:px-4 py-2 sm:py-3">
      <div className="flex gap-1 sm:gap-1.5 flex-wrap">
        {project.featured && (
          <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
            Featured
          </span>
        )}
        <span
          className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${
            project.status === "published" || project.status === "Completed"
              ? "text-green-400 bg-green-400/10 border-green-400/30"
              : project.status === "draft" || project.status === "In Progress"
                ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
                : "text-gray-400 bg-gray-400/10 border-gray-400/30"
          }`}
        >
          {project.status === "published"
            ? "Completed"
            : project.status || "Draft"}
        </span>
      </div>
    </td>
    <td
      className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden md:table-cell ${
        theme === "dark" ? "text-slate-400" : "text-slate-600"
      }`}
    >
      {formatRelativeTime(project.$createdAt || project.$updatedAt)}
    </td>
  </tr>
);
