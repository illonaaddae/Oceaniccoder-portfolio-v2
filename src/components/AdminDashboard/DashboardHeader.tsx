import React from "react";
import { FaSearch } from "react-icons/fa";
import { NotificationsMenu } from "./NotificationsMenu";
import type { NotificationItem } from "./useNotifications";
import type { TabType } from "./types";

interface DashboardHeaderProps {
  theme: "light" | "dark";
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notifications: NotificationItem[];
  notificationCount: number;
  onNavigate: (tab: TabType) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  theme,
  searchQuery,
  onSearchChange,
  notifications,
  notificationCount,
  onNavigate,
}) => (
  <header
    className={`glass-card !rounded-none transition-all duration-300 border-b border-x-0 border-t-0 px-4 sm:px-8 py-4 flex items-center justify-between gap-4 sm:gap-6 relative z-10 ${
      theme === "dark"
        ? "bg-[#111827]/90 backdrop-blur-xl border-gray-800 shadow-lg shadow-black/20"
        : "bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-xl border-oceanic-200/30 shadow-lg shadow-oceanic-100/20"
    }`}
  >
    {/* Spacer for mobile menu button */}
    <div className="w-12 lg:hidden" />

    {/* Search Bar */}
    <div className="flex-1 max-w-md">
      <div
        className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-300 ${
          theme === "dark"
            ? "bg-gray-800/80 border border-gray-700 focus-within:border-oceanic-500/60 focus-within:bg-gray-800 focus-within:ring-1 focus-within:ring-oceanic-500/30"
            : "bg-white/60 border border-oceanic-200/40 focus-within:border-oceanic-400/60 focus-within:bg-white/80 focus-within:ring-1 focus-within:ring-oceanic-400/30"
        }`}
      >
        <FaSearch
          className={`transition-colors duration-300 flex-shrink-0 ${
            theme === "dark" ? "text-white/60" : "text-slate-600/60"
          }`}
        />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`flex-1 bg-transparent outline-none placeholder-opacity-60 transition-colors duration-300 text-sm min-w-0 ${
            theme === "dark"
              ? "text-white placeholder-slate-300"
              : "text-slate-900 placeholder-slate-600"
          }`}
        />
      </div>
    </div>

    <NotificationsMenu
      theme={theme}
      items={notifications}
      count={notificationCount}
      onNavigate={onNavigate}
    />
  </header>
);
