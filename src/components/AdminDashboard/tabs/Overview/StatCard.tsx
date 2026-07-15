import type { StatItem } from "./types";

interface StatCardProps {
  stat: StatItem;
  index: number;
  theme: "light" | "dark";
  onNavigateToTab?: (tab: string) => void;
}

// Single brand accent — no per-index rainbow.
const badgeColor = {
  dark: "bg-oceanic-500/20 text-oceanic-300 border-oceanic-400/30 hover:bg-oceanic-500/30",
  light: "bg-oceanic-100 text-oceanic-700 border-oceanic-200/60",
  dot: "bg-oceanic-400",
};

export const StatCard: React.FC<StatCardProps> = ({ stat, theme, onNavigateToTab }) => {
  const IconComponent = stat.icon;
  const colors = badgeColor;

  return (
    <div
      onClick={() => stat.tabLink && onNavigateToTab?.(stat.tabLink)}
      className={`glass-card card-hover p-4 xs:p-3 sm:p-5 lg:p-6 ${
        stat.tabLink ? "cursor-pointer hover:scale-[1.02]" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3 xs:mb-2 sm:mb-4">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[11px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors duration-300 truncate ${
              theme === "dark" ? "text-gray-400" : "text-slate-700/80"
            }`}
          >
            {stat.label}
          </p>
          <p
            className={`text-2xl xs:text-xl sm:text-3xl lg:text-4xl font-bold mt-1 sm:mt-2 transition-colors duration-300 ${
              theme === "dark" ? "text-white/98" : "text-slate-900"
            }`}
          >
            {stat.value.toLocaleString()}
          </p>
        </div>
        <div
          className={`p-2 xs:p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl backdrop-blur-md bg-gradient-to-br ${stat.bgGradient} shadow-lg flex-shrink-0 ml-2`}
        >
          <IconComponent className="text-white text-base xs:text-sm sm:text-lg lg:text-xl font-bold" />
        </div>
      </div>
      <div
        className={`inline-flex items-center gap-1 px-2 xs:px-2 sm:px-3 py-1 xs:py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] xs:text-[10px] sm:text-xs font-semibold transition-all duration-300 backdrop-blur-sm border ${
          theme === "dark" ? colors.dark : colors.light
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {stat.change}
      </div>
    </div>
  );
};
