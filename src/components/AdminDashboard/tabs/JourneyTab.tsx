import { useState } from "react";
import { FaRoad, FaPlus, FaBriefcase, FaCheckCircle } from "react-icons/fa";
import type { Journey } from "@/types";
import { JourneyCard } from "./Journey/JourneyCard";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/common/Pagination";

const PAGE_SIZE = 10;

type JourneyFilter = "all" | "current" | "past";

// An entry is "current" when its period is open-ended (ends in "Present"/"Now"/"Current").
const isCurrent = (j: Journey) => /present|current|now|ongoing/i.test(j.period ?? "");

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
  const [activeStatus, setActiveStatus] = useState<JourneyFilter>("all");

  const currentCount = journey.filter(isCurrent).length;
  const pastCount = journey.length - currentCount;

  const filtered =
    activeStatus === "all"
      ? journey
      : journey.filter((j) => (activeStatus === "current" ? isCurrent(j) : !isCurrent(j)));
  const { page, setPage, pageItems, totalItems } = usePagination(filtered, PAGE_SIZE);

  const subText = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const pillBase = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap";
  const pillInactive =
    theme === "dark" ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-100";

  const statCards = [
    {
      key: "total",
      label: "Total Experiences",
      count: journey.length,
      sublabel: "career milestones",
      icon: FaRoad,
      grad: "from-oceanic-500 to-oceanic-700",
    },
    {
      key: "current",
      label: "Current",
      count: currentCount,
      sublabel: "ongoing roles",
      icon: FaBriefcase,
      grad: "from-success-500 to-success-700",
    },
    {
      key: "past",
      label: "Past",
      count: pastCount,
      sublabel: "completed roles",
      icon: FaCheckCircle,
      grad: "from-oceanic-600 to-oceanic-900",
    },
  ];

  const tabs: { key: JourneyFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: journey.length },
    { key: "current", label: "Current", count: currentCount },
    { key: "past", label: "Past", count: pastCount },
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

      {!loading && journey.length > 0 && (
        <div
          className={`inline-flex flex-wrap gap-1 p-1 rounded-xl ${
            theme === "dark" ? "bg-white/5" : "bg-slate-100"
          }`}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveStatus(t.key)}
              className={`${pillBase} ${
                activeStatus === t.key ? "bg-oceanic-600 text-white shadow" : pillInactive
              }`}
            >
              {t.label}
              <span
                className={`ml-2 text-xs ${activeStatus === t.key ? "text-white/80" : subText}`}
              >
                {t.count}
              </span>
            </button>
          ))}
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
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            No experiences in this view.
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
