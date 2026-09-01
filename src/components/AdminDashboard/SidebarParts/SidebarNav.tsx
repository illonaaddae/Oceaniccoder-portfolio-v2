import React, { useEffect, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import type { TabDef } from "./tabs";
import {
  groupTabs,
  isGroupCollapsed,
  readCollapsedGroups,
  toggleGroup,
  writeCollapsedGroups,
} from "./sidebarGroups";
import type { TabType } from "./types";

interface SidebarNavProps {
  tabs: TabDef[];
  activeTab: string;
  theme: string;
  onTabChange: (tab: TabType) => void;
  pendingBookings?: number;
  isCollapsed?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  tabs,
  activeTab,
  theme,
  onTabChange,
  pendingBookings = 0,
  isCollapsed = false,
}) => {
  const isDark = theme === "dark";
  const groups = groupTabs(tabs);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>(readCollapsedGroups);

  useEffect(() => {
    writeCollapsedGroups(collapsedGroups);
  }, [collapsedGroups]);

  const renderTab = (tab: TabDef) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    const badge = tab.id === "bookings" && pendingBookings > 0 ? pendingBookings : 0;
    return (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        title={tab.label}
        className={`relative w-full flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-2.5 rounded-xl transition-all duration-200 touch-manipulation min-h-[44px] ${
          isCollapsed ? "lg:justify-center lg:gap-0 lg:px-0" : ""
        } ${
          isActive
            ? isDark
              ? "bg-oceanic-500/15 border border-oceanic-500/30 text-oceanic-500"
              : "bg-gradient-to-r from-oceanic-400/30 to-oceanic-400/20 border border-oceanic-300/50 text-oceanic-700 shadow-lg shadow-oceanic-200/20"
            : isDark
              ? "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 border border-transparent active:bg-gray-700/80"
              : "text-slate-600 hover:bg-white/40 hover:text-slate-900 active:bg-white/60"
        }`}
      >
        <Icon
          className={`text-base flex-shrink-0 ${
            isActive ? (isDark ? "text-oceanic-500" : "text-oceanic-600") : ""
          }`}
        />
        <span className={`font-medium text-sm flex-1 text-left ${isCollapsed ? "lg:hidden" : ""}`}>
          {tab.label}
        </span>
        {badge > 0 && (
          <span
            className={`ml-auto min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full flex items-center justify-center bg-warning-500 text-white ${
              isCollapsed ? "lg:absolute lg:top-1 lg:right-1 lg:ml-0 lg:min-w-[16px] lg:h-4" : ""
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
      {groups.map((group, index) => {
        const collapsed = isGroupCollapsed(group.id, collapsedGroups, activeTab);
        const holdsActive = group.tabs.some((tab) => tab.id === activeTab);

        return (
          <div key={group.id} className={index > 0 ? "mt-4" : ""}>
            {/* On the icon-only rail there is no room for a heading, so groups
                are separated by a rule instead. */}
            {isCollapsed && index > 0 && (
              <div
                aria-hidden="true"
                className={`hidden lg:block h-px mx-2 mb-4 ${isDark ? "bg-white/10" : "bg-slate-900/10"}`}
              />
            )}

            <button
              type="button"
              onClick={() => setCollapsedGroups((prev) => toggleGroup(prev, group.id))}
              aria-expanded={!collapsed}
              // The group holding the current page never hides, so its toggle
              // would be a control that visibly does nothing.
              disabled={holdsActive}
              className={`w-full flex items-center gap-1.5 px-3 sm:px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors disabled:cursor-default ${
                isCollapsed ? "lg:hidden" : ""
              } ${
                isDark
                  ? "text-gray-500 hover:text-gray-300 disabled:hover:text-gray-500"
                  : "text-slate-400 hover:text-slate-600 disabled:hover:text-slate-400"
              }`}
            >
              <span className="flex-1 text-left">{group.label}</span>
              {!holdsActive && (
                <FaChevronDown
                  aria-hidden="true"
                  className={`text-[9px] transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                />
              )}
            </button>

            {!collapsed && <div className="space-y-1">{group.tabs.map(renderTab)}</div>}
          </div>
        );
      })}
    </nav>
  );
};
