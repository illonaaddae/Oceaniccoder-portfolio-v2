import type { Project } from "@/types";

// prettier-ignore
const statusCls = (s?: string) =>
  s === "published" || s === "Completed" ? "text-success-400 bg-success-400/10 border-success-400/30"
  : s === "draft" || s === "In Progress" ? "text-warning-400 bg-warning-400/10 border-warning-400/30"
  : s === "Planning" ? "text-info-400 bg-info-400/10 border-info-400/30"
  : "text-gray-400 bg-gray-400/10 border-gray-400/30";

export const StatusBadge: React.FC<{
  project: Project;
  size?: "sm" | "md";
}> = ({ project, size = "sm" }) => (
  <span
    className={`${size === "sm" ? "px-2 py-0.5" : "px-3 py-1"} rounded-full text-xs font-medium border ${statusCls(project.status)}`}
  >
    {project.status === "published" ? "Completed" : project.status || "Draft"}
  </span>
);

export const FeaturedBadge: React.FC<{ size?: "sm" | "md" }> = ({ size = "sm" }) => (
  <span
    className={`bg-gradient-to-r from-oceanic-500 to-oceanic-700 text-white text-xs ${size === "sm" ? "px-2 py-0.5" : "px-3 py-1 shadow-sm"} rounded-full font-medium`}
  >
    Featured
  </span>
);
