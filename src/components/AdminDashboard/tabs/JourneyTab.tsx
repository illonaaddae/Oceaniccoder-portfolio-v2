import { FaRoad, FaPlus } from "react-icons/fa";
import type { Journey } from "@/types";
import { JourneyCard } from "./Journey/JourneyCard";

interface JourneyTabProps {
  theme: "light" | "dark";
  loading: boolean;
  journey: Journey[];
  onDelete: (id: string) => void;
  onEdit?: (item: Journey) => void;
  onShowForm?: () => void;
  isReadOnly?: boolean;
}

export const JourneyTab: React.FC<JourneyTabProps> = ({
  theme,
  loading,
  journey,
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
        {!isReadOnly && (
          <button
            onClick={onShowForm}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-medium text-sm sm:text-base transition duration-200 border shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-500 hover:to-oceanic-900 shadow-oceanic-500/20"
                : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-400 hover:to-oceanic-800 shadow-oceanic-500/20"
            }`}
          >
            <FaPlus className="text-sm" />
            Add Journey
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            Loading journey...
          </p>
        </div>
      ) : journey.length === 0 ? (
        <div
          className={`glass-card border rounded-2xl p-12 text-center transition-colors duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <FaRoad
            className={`text-4xl mx-auto mb-4 ${
              theme === "dark" ? "text-gray-600" : "text-slate-400/60"
            }`}
          />
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            No journey milestones yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {journey.map((item) => (
            <JourneyCard
              key={item.$id}
              item={item}
              theme={theme}
              isReadOnly={isReadOnly}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
