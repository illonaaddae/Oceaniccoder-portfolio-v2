import { FaChartLine } from "react-icons/fa";
import type { ActivityItem } from "./buildActivity";
import { ActivityRow } from "./ActivityRow";

interface RecentActivityProps {
  theme: "light" | "dark";
  items: ActivityItem[];
  onNavigateToTab?: (tab: string) => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  theme,
  items,
  onNavigateToTab,
}) => (
  <div className="lg:col-span-2 glass-card p-4 sm:p-6">
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <h2
        className={`text-base sm:text-lg font-bold transition-colors duration-300 ${
          theme === "dark" ? "text-white" : "text-slate-900"
        }`}
      >
        <FaChartLine className="inline mr-2" />
        Recent Activity
      </h2>
    </div>

    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-xs sm:text-sm min-w-[400px]">
        <thead>
          <tr
            className={`border-b transition-colors duration-300 ${
              theme === "dark" ? "border-white/10" : "border-oceanic-200/30"
            }`}
          >
            {["Item Name", "Category", "Status", "Time"].map((header, i) => (
              <th
                key={header}
                className={`text-left px-3 sm:px-4 py-2 sm:py-3 font-bold uppercase text-[10px] sm:text-xs tracking-wider transition-colors duration-300 ${
                  i === 1 ? "hidden sm:table-cell" : i === 3 ? "hidden md:table-cell" : ""
                } ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ActivityRow
              key={item.id}
              item={item}
              theme={theme}
              onNavigateToTab={onNavigateToTab}
            />
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center">
                <p
                  className={`transition-colors duration-300 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  No recent activity
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
