import { FaCode, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import type { Skill } from "@/types";

interface SkillsTabProps {
  theme: "light" | "dark";
  loading: boolean;
  filteredSkills: Skill[];
  onDelete: (skillId: string) => void;
  onEdit: (skill: Skill) => void;
  onShowForm: () => void;
}

export const SkillsTab: React.FC<SkillsTabProps> = ({
  theme,
  loading,
  filteredSkills,
  onDelete,
  onEdit,
  onShowForm,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Skills
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-200/90" : "text-slate-700/80"
            }`}
          >
            Manage your technical skills
          </p>
        </div>
        <button
          onClick={onShowForm}
          className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold text-sm sm:text-base transition duration-200 border shadow-lg ${
            theme === "dark"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500/50 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
              : "bg-gradient-to-r from-blue-500 to-cyan-400 border-blue-400/50 text-white hover:from-blue-600 hover:to-cyan-500 shadow-blue-400/30"
          }`}
        >
          <FaPlus className="text-sm" />
          Add Skill
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Loading skills...
          </p>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div
          className={`glass-card border rounded-2xl p-12 text-center transition-colors duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <FaCode
            className={`text-4xl mx-auto mb-4 transition-colors duration-300 ${
              theme === "dark" ? "text-gray-600" : "text-slate-400/60"
            }`}
          />
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            No skills added yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredSkills.map((skill) => (
            <div
              key={skill.$id}
              className={`glass-card border p-4 sm:p-6 rounded-xl transition-all duration-200 ${
                theme === "dark"
                  ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600 hover:bg-gray-800/70"
                  : "bg-white/40 border-blue-200/30 hover:border-blue-200/50 hover:bg-white/50"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p
                    className={`text-sm font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {skill.name}
                  </p>
                  <p
                    className={`text-xs transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {skill.category}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    theme === "dark"
                      ? "bg-cyan-500/30 text-cyan-100"
                      : "bg-blue-400/20 text-blue-700"
                  }`}
                >
                  {skill.percentage}%
                </span>
              </div>

              <div className="mb-4">
                <div
                  className={`w-full h-2 rounded-full overflow-hidden transition-colors duration-300 ${
                    theme === "dark" ? "bg-white/10" : "bg-blue-200/30"
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      theme === "dark"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-400"
                        : "bg-gradient-to-r from-blue-400 to-cyan-400"
                    }`}
                    style={{ width: `${skill.percentage}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(skill)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition text-sm ${
                    theme === "dark"
                      ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/30"
                      : "bg-blue-400/20 border-blue-300/30 text-blue-700 hover:bg-blue-400/30"
                  }`}
                >
                  <FaEdit className="text-sm" />
                  Edit
                </button>
                <button
                  onClick={() => onDelete(skill.$id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition text-sm ${
                    theme === "dark"
                      ? "bg-red-500/20 border-red-400/30 text-red-200 hover:bg-red-500/30"
                      : "bg-red-400/20 border-red-300/30 text-red-700 hover:bg-red-400/30"
                  }`}
                >
                  <FaTrash className="text-sm" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
