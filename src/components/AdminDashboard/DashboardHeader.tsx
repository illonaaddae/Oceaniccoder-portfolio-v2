import React from "react";
import { FaBell, FaSearch } from "react-icons/fa";

interface DashboardHeaderProps {
  theme: "light" | "dark";
  searchQuery: string;
  onSearchChange: (query: string) => void;
  newMessages: number;
  onNotificationClick: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  theme,
  searchQuery,
  onSearchChange,
  newMessages,
  onNotificationClick,
}) => (
  <header
    className={`glass-card transition-all duration-300 border-b px-4 sm:px-8 py-4 flex items-center justify-between gap-4 sm:gap-6 relative z-10 ${
      theme === "dark"
        ? "bg-[#111827]/90 backdrop-blur-xl border-gray-800 shadow-lg shadow-black/20"
        : "bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-xl border-blue-200/30 shadow-lg shadow-blue-100/20"
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
            : "bg-white/60 border border-blue-200/40 focus-within:border-blue-400/60 focus-within:bg-white/80 focus-within:ring-1 focus-within:ring-blue-400/30"
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

    <button
      onClick={onNotificationClick}
      title={
        newMessages > 0
          ? `${newMessages} new message${newMessages > 1 ? "s" : ""}`
          : "No new messages"
      }
      className={`relative p-2 rounded-lg transition flex-shrink-0 ${
        theme === "dark"
          ? "text-slate-200 hover:text-oceanic-400 hover:bg-white/10"
          : "text-slate-700 hover:text-oceanic-600 hover:bg-white/40"
      }`}
    >
      <FaBell className="text-xl" />
      {newMessages > 0 && (
        <span
          className={`absolute top-0 right-0 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg ${
            theme === "dark"
              ? "bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/50"
              : "bg-gradient-to-r from-red-400 to-pink-400 shadow-red-400/50"
          }`}
        >
          {newMessages}
        </span>
      )}
    </button>
  </header>
);
