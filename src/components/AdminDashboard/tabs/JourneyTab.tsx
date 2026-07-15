import { FaRoad, FaPlus, FaBuilding, FaTrophy } from "react-icons/fa";
import type { Journey } from "@/types";
import { JourneyCard } from "./Journey/JourneyCard";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/common/Pagination";

const PAGE_SIZE = 10;

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
  const { page, setPage, pageItems, totalItems } = usePagination(journey, PAGE_SIZE);

  // Summary stats — derived honestly from the Journey data (no status field exists).
  const totalExperiences = journey.length;
  const companyCount = new Set(journey.map((j) => j.company?.trim().toLowerCase()).filter(Boolean))
    .size;
  const withAchievements = journey.filter((j) => (j.achievements?.length ?? 0) > 0).length;

  const subText = theme === "dark" ? "text-slate-400" : "text-slate-500";

  const statCards = [
    {
      key: "total",
      label: "Total Experiences",
      count: totalExperiences,
      sublabel: "career milestones",
      icon: FaRoad,
      grad: "from-oceanic-500 to-oceanic-700",
    },
    {
      key: "companies",
      label: "Companies",
      count: companyCount,
      sublabel: "distinct organizations",
      icon: FaBuilding,
      grad: "from-oceanic-600 to-oceanic-900",
    },
    {
      key: "achievements",
      label: "With Achievements",
      count: withAchievements,
      sublabel: "list key wins",
      icon: FaTrophy,
      grad: "from-oceanic-400 to-oceanic-700",
    },
  ];

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

      {!loading && journey.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="glass-card p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wider truncate ${subText}`}
                  >
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{s.count}</p>
                  <p className={`text-xs mt-0.5 truncate ${subText}`}>{s.sublabel}</p>
                </div>
                <div
                  className={`p-2.5 rounded-xl bg-gradient-to-br ${s.grad} shadow-lg flex-shrink-0`}
                >
                  <Icon className="text-white text-lg" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            Loading journey...
          </p>
        </div>
      ) : journey.length === 0 ? (
        <div className="glass-card p-12 text-center">
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
          {pageItems.map((item) => (
            <JourneyCard
              key={item.$id}
              item={item}
              theme={theme}
              isReadOnly={isReadOnly}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          <Pagination
            page={page}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
};
