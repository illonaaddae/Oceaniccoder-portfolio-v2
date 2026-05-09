import { FaChartLine } from "react-icons/fa";
import type { Message, Project } from "@/types";
import { ProjectRow } from "./ProjectRow";
import { MessageRow } from "./MessageRow";

interface RecentActivityProps {
  theme: "light" | "dark";
  recentProjects: Project[];
  recentMessages: Message[];
  onNavigateToTab?: (tab: string) => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  theme,
  recentProjects,
  recentMessages,
  onNavigateToTab,
}) => (
  <div
    className={`lg:col-span-2 glass-card border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-colors duration-200 ${
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700/80"
        : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
    }`}
  >
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <h2
        className={`text-base sm:text-lg font-bold transition-colors duration-300 ${
          theme === "dark" ? "text-white" : "text-slate-900"
        }`}
      >
        <FaChartLine className="inline mr-2" />
        Recent Activity
      </h2>
      <button
        onClick={() => onNavigateToTab?.("projects")}
        className={`text-sm font-bold transition-colors duration-200 ${
          theme === "dark"
            ? "text-oceanic-500 hover:text-oceanic-400"
            : "text-oceanic-600 hover:text-oceanic-700"
        }`}
      >
        View all
      </button>
    </div>

    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-xs sm:text-sm min-w-[400px]">
        <thead>
          <tr
            className={`border-b transition-colors duration-300 ${
              theme === "dark" ? "border-white/10" : "border-blue-200/30"
            }`}
          >
            {["Item Name", "Category", "Status", "Time"].map((header, i) => (
              <th
                key={header}
                className={`text-left px-3 sm:px-4 py-2 sm:py-3 font-bold uppercase text-[10px] sm:text-xs tracking-wider transition-colors duration-300 ${
                  i === 1
                    ? "hidden sm:table-cell"
                    : i === 3
                      ? "hidden md:table-cell"
                      : ""
                } ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recentProjects.slice(0, 5).map((proj) => (
            <ProjectRow key={proj.$id} project={proj} theme={theme} />
          ))}
          {recentMessages.slice(0, 2).map((msg) => (
            <MessageRow key={msg.$id} message={msg} theme={theme} />
          ))}
          {recentMessages.length === 0 && recentProjects.length === 0 && (
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
