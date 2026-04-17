import { allTabs } from "./tabs";
import type { TabType } from "./types";

interface SidebarNavProps {
  tabs: typeof allTabs;
  activeTab: string;
  theme: string;
  onTabChange: (tab: TabType) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  tabs,
  activeTab,
  theme,
  onTabChange,
}) => {
  return (
    <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-2.5 rounded-xl transition-all duration-200 touch-manipulation min-h-[44px] ${
              isActive
                ? theme === "dark"
                  ? "bg-oceanic-500/15 border border-oceanic-500/30 text-oceanic-500"
                  : "bg-gradient-to-r from-blue-400/30 to-oceanic-400/20 border border-blue-300/50 text-blue-700 shadow-lg shadow-blue-200/20"
                : theme === "dark"
                ? "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 border border-transparent active:bg-gray-700/80"
                : "text-slate-600 hover:bg-white/40 hover:text-slate-900 active:bg-white/60"
            }`}
          >
            <Icon
              className={`text-base flex-shrink-0 ${
                isActive
                  ? theme === "dark"
                    ? "text-oceanic-500"
                    : "text-oceanic-600"
                  : ""
              }`}
            />
            <span className="font-medium text-sm">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
