// prettier-ignore
import { useState } from "react";
// prettier-ignore
import { FaProjectDiagram, FaCheckCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";
// prettier-ignore
import type { Project } from "@/types";
// prettier-ignore
import { ProjectsHeader } from "./Projects/ProjectsHeader";
// prettier-ignore
import { ProjectStats } from "./Projects/ProjectStats";
// prettier-ignore
import { ProjectSearch } from "./Projects/ProjectSearch";
// prettier-ignore
import { ProjectMobileCard } from "./Projects/ProjectMobileCard";
// prettier-ignore
import { ProjectTableRow } from "./Projects/ProjectTableRow";

// prettier-ignore
type Props = { theme: "light"|"dark"; loading: boolean; filteredProjects: Project[]; onDelete: (id: string) => Promise<void>|void; onEdit?: (p: Project) => void; onShowForm?: () => void; isReadOnly?: boolean; };

// prettier-ignore
export const ProjectsTab: React.FC<Props> = ({ theme, loading, filteredProjects, onDelete, onEdit, onShowForm, isReadOnly = false }) => {
  const [toast, setToast] = useState<{type:"success"|"error"; message:string}|null>(null);
  const showToast = (type:"success"|"error", message:string) => { setToast({type,message}); setTimeout(()=>setToast(null),4000); };
  const handleDelete = async (id:string) => {
    try { await onDelete(id); showToast("success","Project deleted successfully!"); }
    catch(e:unknown) { if(e instanceof Error && e.message==="cancelled") return; console.error("Failed to delete project:",e); showToast("error","Failed to delete project. Please try again."); }
  };
  const th = `px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${theme==="dark"?"text-white/95":"text-slate-700/90"}`;
  const emptyCard = `glass-card backdrop-blur-xl border rounded-2xl p-12 text-center transition-colors duration-300 ${theme==="dark"?"bg-gradient-to-br from-white/8 to-white/4 border-white/20":"bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"}`;
  const tableCard = `hidden md:block glass-card backdrop-blur-xl border rounded-2xl overflow-hidden transition-colors duration-300 ${theme==="dark"?"bg-gradient-to-br from-white/8 to-white/4 border-white/20":"bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"}`;
  const toastCls = toast ? `fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg ${toast.type==="success" ? (theme==="dark"?"bg-green-500/20 border-green-400/50 text-green-300":"bg-green-50 border-green-200 text-green-700") : (theme==="dark"?"bg-red-500/20 border-red-400/50 text-red-300":"bg-red-50 border-red-200 text-red-700")}` : "";

  return (
    <div className="space-y-4 sm:space-y-6">
      {toast && (<div className={toastCls}>
        {toast.type==="success" ? <FaCheckCircle className="text-lg flex-shrink-0"/> : <FaExclamationCircle className="text-lg flex-shrink-0"/>}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button onClick={()=>setToast(null)} className="p-1 rounded-lg hover:bg-black/10 transition-colors" aria-label="Dismiss"><FaTimes className="text-xs"/></button>
      </div>)}
      <ProjectsHeader theme={theme} isReadOnly={isReadOnly} onShowForm={onShowForm}/>
      <ProjectStats theme={theme} projects={filteredProjects}/>
      <ProjectSearch theme={theme}/>
      {loading ? (
        <div className="text-center py-12"><p className={`transition-colors duration-300 ${theme==="dark"?"text-slate-300":"text-slate-600"}`}>Loading projects...</p></div>
      ) : filteredProjects.length===0 ? (
        <div className={emptyCard}>
          <FaProjectDiagram className={`text-4xl mx-auto mb-4 ${theme==="dark"?"text-slate-400/50":"text-slate-400/60"}`}/>
          <p className={theme==="dark"?"text-slate-300":"text-slate-600"}>No projects yet</p>
        </div>
      ) : (<>
        <div className="block md:hidden space-y-4">
          {filteredProjects.map((p)=>(<ProjectMobileCard key={p.$id} theme={theme} project={p} isReadOnly={isReadOnly} onEdit={onEdit} onDelete={handleDelete}/>))}
        </div>
        <div className={tableCard}><div className="overflow-x-auto"><table className="w-full">
          <thead><tr className={`border-b transition-colors duration-300 ${theme==="dark"?"border-white/20":"border-blue-200/40"}`}>
            <th className={`${th} py-4`}>Project Name</th><th className={th}>Status</th><th className={th}>Technologies</th><th className={th}>Actions</th>
          </tr></thead>
          <tbody className={`divide-y transition-colors duration-300 ${theme==="dark"?"divide-white/5":"divide-blue-200/20"}`}>
            {filteredProjects.map((p)=>(<ProjectTableRow key={p.$id} theme={theme} project={p} isReadOnly={isReadOnly} onEdit={onEdit} onDelete={handleDelete}/>))}
          </tbody>
        </table></div></div>
      </>)}
    </div>
  );
};
