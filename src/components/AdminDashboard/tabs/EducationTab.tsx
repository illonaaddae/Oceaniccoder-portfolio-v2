import { FaGraduationCap, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import type { Education } from "@/types";

interface EducationTabProps {
  theme: "light" | "dark";
  loading: boolean;
  education: Education[];
  onDelete: (id: string) => void;
  onEdit?: (edu: Education) => void;
  onShowForm?: () => void;
  isReadOnly?: boolean;
}

export const EducationTab: React.FC<EducationTabProps> = ({
  theme,
  loading,
  education,
  onDelete,
  onEdit,
  onShowForm,
  isReadOnly = false,
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
            Education
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Manage your educational background
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={onShowForm}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-medium text-sm sm:text-base transition duration-200 border shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500/50 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 border-blue-400/50 text-white hover:from-blue-600 hover:to-cyan-500 shadow-blue-400/30"
            }`}
          >
            <FaPlus className="text-sm" />
            Add Education
          </button>
        )}
      </div>

      {/* Education List */}
      {loading ? (
        <div className="text-center py-12">
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            Loading education...
          </p>
        </div>
      ) : education.length === 0 ? (
        <div
          className={`glass-card border rounded-2xl p-12 text-center transition-colors duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <FaGraduationCap
            className={`text-4xl mx-auto mb-4 ${
              theme === "dark" ? "text-gray-600" : "text-slate-400/60"
            }`}
          />
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            No education records yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {education.map((edu) => (
            <div
              key={edu.$id}
              className={`glass-card border rounded-2xl p-6 transition-all duration-200 ${
                theme === "dark"
                  ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
                  : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {(edu.universityLogo || edu.logo) && (
                    <img
                      src={edu.universityLogo || edu.logo}
                      alt={edu.institution}
                      className="w-12 h-12 rounded-lg object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <div>
                    <h3
                      className={`text-lg font-bold ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {edu.degree}
                      {edu.field && ` in ${edu.field}`}
                    </h3>
                    <p
                      className={`${
                        theme === "dark" ? "text-cyan-400" : "text-blue-600"
                      }`}
                    >
                      {edu.institution}
                    </p>
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {edu.period}
                    </p>
                    {edu.description && (
                      <p
                        className={`mt-2 text-sm ${
                          theme === "dark" ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {edu.description}
                      </p>
                    )}
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit?.(edu)}
                      className={`p-2 rounded-lg transition ${
                        theme === "dark"
                          ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this education record?")) {
                          onDelete(edu.$id);
                        }
                      }}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
