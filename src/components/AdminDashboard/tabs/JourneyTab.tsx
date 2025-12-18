import { FaRoad, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import type { Journey } from "@/types";

interface JourneyTabProps {
  theme: "light" | "dark";
  loading: boolean;
  journey: Journey[];
  onDelete: (id: string) => void;
  onEdit?: (item: Journey) => void;
  onShowForm?: () => void;
}

export const JourneyTab: React.FC<JourneyTabProps> = ({
  theme,
  loading,
  journey,
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
            Journey
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Manage your career journey milestones
          </p>
        </div>
        <button
          onClick={onShowForm}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500 transition duration-300"
        >
          <FaPlus className="text-sm" />
          Add Journey
        </button>
      </div>

      {/* Journey List */}
      {loading ? (
        <div className="text-center py-12">
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            Loading journey...
          </p>
        </div>
      ) : journey.length === 0 ? (
        <div
          className={`glass-card backdrop-blur-xl border rounded-2xl p-12 text-center ${
            theme === "dark"
              ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <FaRoad
            className={`text-4xl mx-auto mb-4 ${
              theme === "dark" ? "text-slate-400/50" : "text-slate-400/60"
            }`}
          />
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            No journey milestones yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {journey.map((item) => (
            <div
              key={item.$id}
              className={`glass-card backdrop-blur-xl border rounded-2xl p-6 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
                  : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Color indicator */}
                    <div
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${item.color || "from-cyan-500 to-blue-500"}`}
                    />
                    <h3
                      className={`text-lg font-bold ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {item.role}
                    </h3>
                  </div>
                  <p
                    className={`${
                      theme === "dark" ? "text-cyan-400" : "text-blue-600"
                    }`}
                  >
                    {item.company}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-1">
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {item.period}
                    </p>
                    {item.location && (
                      <p
                        className={`text-sm ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        📍 {item.location}
                      </p>
                    )}
                  </div>
                  {item.description && (
                    <p
                      className={`mt-3 text-sm ${
                        theme === "dark" ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {item.description}
                    </p>
                  )}
                  {item.achievements && item.achievements.length > 0 && (
                    <div className="mt-3">
                      <p
                        className={`text-xs font-semibold mb-2 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Key Achievements:
                      </p>
                      <ul className="space-y-1">
                        {item.achievements.map((achievement, idx) => (
                          <li
                            key={idx}
                            className={`text-sm flex items-start gap-2 ${
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            <span className="text-green-400">•</span>
                            {achievement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onEdit?.(item)}
                    className={`p-2 rounded-lg transition ${
                      theme === "dark"
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this journey milestone?")) {
                        onDelete(item.$id);
                      }
                    }}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
