import type { ActivityItem, StatusTone } from "./buildActivity";
import { formatRelativeTime } from "@/utils/formatters";

interface ActivityRowProps {
  item: ActivityItem;
  theme: "light" | "dark";
  onNavigateToTab?: (tab: string) => void;
}

// Real statuses keep their semantic colors; Featured keeps its filled gradient
// badge; metadata (neutral) uses the Certifications table's teal outline pill.
const OUTLINE = "px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border";
const pillClass = (tone: StatusTone): string => {
  switch (tone) {
    case "featured":
      return "px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-oceanic-500 to-oceanic-700 text-white";
    case "success":
      return `${OUTLINE} bg-success-400/10 text-success-400 border-success-400/30`;
    case "warning":
      return `${OUTLINE} bg-warning-400/10 text-warning-400 border-warning-400/30`;
    case "info":
      return `${OUTLINE} bg-info-400/10 text-info-400 border-info-400/30`;
    case "neutral":
    default:
      return `${OUTLINE} bg-info-400/10 text-info-400 border-info-400/30`;
  }
};

export const ActivityRow: React.FC<ActivityRowProps> = ({ item, theme, onNavigateToTab }) => {
  const Icon = item.icon;
  const pill = pillClass(item.statusTone ?? "neutral");
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
            className={`${pill} truncate inline-block max-w-[160px] align-middle`}
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
