import { FaProjectDiagram, FaEdit, FaTrash } from "react-icons/fa";
import type { Project } from "@/types";
import { StatusBadge, FeaturedBadge } from "./StatusBadge";

// prettier-ignore
type Props = { theme: "light"|"dark"; project: Project; isReadOnly: boolean; onEdit?: (p: Project) => void; onDelete: (id: string) => void; };

// prettier-ignore
export const ProjectTableRow: React.FC<Props> = ({ theme, project, isReadOnly, onEdit, onDelete }) => (
  <tr className={`transition-all duration-300 border-b ${theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-blue-200/20 hover:bg-white/20"}`}>
    <td className={`px-4 py-4 transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-oceanic-500 flex items-center justify-center">
          <FaProjectDiagram className="text-white text-sm" />
        </div>
        <div>
          <span className="font-bold text-sm">{project.title}</span>
          <p className={`text-xs transition-colors duration-300 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{project.description?.substring(0, 30)}...</p>
        </div>
      </div>
    </td>
    <td className="px-4 py-4">
      <div className="flex gap-2 flex-wrap">
        {project.featured && <FeaturedBadge size="md" />}
        <StatusBadge project={project} size="md" />
      </div>
    </td>
    <td className={`px-4 py-4 text-sm font-medium transition-colors duration-300 ${theme === "dark" ? "text-slate-200/90" : "text-slate-700/90"}`}>
      <div className="flex gap-2">
        {project.technologies?.slice(0, 2).map((tech) => (
          <span key={tech} className={`text-xs px-2 py-1 rounded backdrop-blur-sm border transition-colors duration-300 ${theme === "dark" ? "bg-white/10 border-white/20 text-white" : "bg-white/40 border-blue-200/40 text-slate-900"}`}>{tech}</span>
        ))}
      </div>
    </td>
    <td className="px-4 py-4">
      {!isReadOnly && (
        <div className="flex gap-2">
          <button onClick={() => onEdit?.(project)} className={`p-2 rounded-lg transition ${theme === "dark" ? "text-oceanic-500 hover:bg-white/10" : "text-oceanic-600 hover:bg-white/30"}`} title="Edit project"><FaEdit className="text-sm" /></button>
          <button onClick={() => onDelete(project.$id)} className={`p-2 rounded-lg transition ${theme === "dark" ? "text-red-400 hover:bg-white/10" : "text-red-600 hover:bg-white/30"}`} title="Delete project"><FaTrash className="text-sm" /></button>
        </div>
      )}
    </td>
  </tr>
);
