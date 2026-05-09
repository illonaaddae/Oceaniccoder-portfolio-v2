import type { Project } from "@/types";

// prettier-ignore
const statusCls = (s?: string) =>
  s === "published" || s === "Completed" ? "text-green-400 bg-green-400/10 border-green-400/30"
  : s === "draft" || s === "In Progress" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
  : s === "Planning" ? "text-blue-400 bg-blue-400/10 border-blue-400/30"
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

export const FeaturedBadge: React.FC<{ size?: "sm" | "md" }> = ({
  size = "sm",
}) => (
  <span
    className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs ${size === "sm" ? "px-2 py-0.5" : "px-3 py-1 shadow-sm"} rounded-full font-medium`}
  >
    Featured
  </span>
);
