import { FaProjectDiagram, FaEdit, FaTrash } from "react-icons/fa";
import type { Project } from "@/types";
import { StatusBadge, FeaturedBadge } from "./StatusBadge";

// prettier-ignore
type Props = { theme: "light"|"dark"; project: Project; isReadOnly: boolean; onEdit?: (p: Project) => void; onDelete: (id: string) => void; };

// prettier-ignore
export const ProjectMobileCard: React.FC<Props> = ({ theme, project, isReadOnly, onEdit, onDelete }) => (
  <div className={`glass-card backdrop-blur-xl border rounded-xl p-4 transition-colors duration-300 ${theme === "dark" ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20" : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-oceanic-500 flex items-center justify-center flex-shrink-0">
          <FaProjectDiagram className="text-white text-sm" />
        </div>
        <div className="min-w-0">
          <h3 className={`font-bold text-sm truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{project.title}</h3>
          <p className={`text-xs truncate ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{project.description?.substring(0, 40)}...</p>
        </div>
      </div>
      {!isReadOnly && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit?.(project)} className={`p-2 rounded-lg transition ${theme === "dark" ? "text-oceanic-500 hover:bg-white/10" : "text-oceanic-600 hover:bg-white/30"}`} title="Edit project"><FaEdit className="text-sm" /></button>
          <button onClick={() => onDelete(project.$id)} className={`p-2 rounded-lg transition ${theme === "dark" ? "text-red-400 hover:bg-white/10" : "text-red-600 hover:bg-white/30"}`} title="Delete project"><FaTrash className="text-sm" /></button>
        </div>
      )}
    </div>
    <div className="flex gap-2 flex-wrap mb-3">
      {project.featured && <FeaturedBadge />}
      <StatusBadge project={project} />
    </div>
    <div className="flex gap-1.5 flex-wrap">
      {project.technologies?.slice(0, 3).map((tech) => (
        <span key={tech} className={`text-xs px-2 py-0.5 rounded backdrop-blur-sm border ${theme === "dark" ? "bg-white/10 border-white/20 text-white" : "bg-white/40 border-blue-200/40 text-slate-900"}`}>{tech}</span>
      ))}
      {project.technologies && project.technologies.length > 3 && (
        <span className={`text-xs px-2 py-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>+{project.technologies.length - 3}</span>
      )}
    </div>
  </div>
);
