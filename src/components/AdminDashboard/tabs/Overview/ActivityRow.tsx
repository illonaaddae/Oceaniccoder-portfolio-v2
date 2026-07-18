import type { ActivityItem, StatusTone } from "./buildActivity";
import { formatRelativeTime } from "@/utils/formatters";

interface ActivityRowProps {
  item: ActivityItem;
  theme: "light" | "dark";
  onNavigateToTab?: (tab: string) => void;
}

const toneClasses = (tone: StatusTone, isDark: boolean): string => {
  const map: Record<StatusTone, string> = {
    success: "text-success-500 bg-success-500/10 border-success-500/30",
    warning: "text-warning-500 bg-warning-500/10 border-warning-500/30",
    info: "text-info-500 bg-info-500/10 border-info-500/30",
    neutral: isDark
      ? "text-slate-300 bg-slate-500/15 border-slate-400/30"
      : "text-slate-600 bg-slate-500/10 border-slate-400/40",
    featured: "text-white bg-gradient-to-r from-oceanic-500 to-oceanic-700 border-transparent",
  };
  return map[tone];
};

export const ActivityRow: React.FC<ActivityRowProps> = ({ item, theme, onNavigateToTab }) => {
  const Icon = item.icon;
  const tone = toneClasses(item.statusTone ?? "neutral", theme === "dark");
  return (
    <tr
      onClick={() => onNavigateToTab?.(item.tab)}
      className={`border-b cursor-pointer transition-colors duration-300 ${
        theme === "dark"
          ? "border-white/5 hover:bg-white/5"
          : "border-blue-200/20 hover:bg-white/20"
      }`}
    >
      <td className="px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-oceanic-500/30 flex items-center justify-center flex-shrink-0">
            <Icon className="text-oceanic-400 text-[10px] sm:text-xs" />
          </div>
          <span
            className={`font-medium transition-colors duration-300 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none ${
              theme === "dark" ? "text-white/95" : "text-slate-900"
            }`}
          >
            {item.name}
          </span>
        </div>
      </td>
      <td
        className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden sm:table-cell ${
          theme === "dark" ? "text-slate-200/90" : "text-slate-700"
        }`}
      >
        {item.category}
      </td>
      <td className="px-3 sm:px-4 py-2 sm:py-3">
        {item.status && (
          <span
            title={item.status}
            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border truncate inline-block max-w-[140px] align-middle ${tone}`}
          >
            {item.status}
          </span>
        )}
      </td>
      <td
        className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden md:table-cell ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}
      >
        {item.timestamp ? formatRelativeTime(item.timestamp) : "—"}
      </td>
    </tr>
  );
};
