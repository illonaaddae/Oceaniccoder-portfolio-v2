import { FaEdit, FaTrash } from "react-icons/fa";
import type { Journey } from "@/types";

interface JourneyCardProps {
  item: Journey;
  theme: "light" | "dark";
  isReadOnly: boolean;
  onEdit?: (item: Journey) => void;
  onDelete: (id: string) => void;
}

export const JourneyCard: React.FC<JourneyCardProps> = ({
  item,
  theme,
  isReadOnly,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={`glass-card border rounded-2xl p-6 transition-all duration-200 ${
        theme === "dark"
          ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
          : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Color indicator */}
            <div
              className={`w-3 h-3 rounded-full bg-gradient-to-r ${
                item.color || "from-oceanic-500 to-oceanic-900"
              }`}
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
              theme === "dark" ? "text-oceanic-500" : "text-oceanic-600"
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
                      theme === "dark" ? "text-slate-300" : "text-slate-600"
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
        {!isReadOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit?.(item)}
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
        )}
      </div>
    </div>
  );
};
