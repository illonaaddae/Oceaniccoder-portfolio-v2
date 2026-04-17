import React from "react";
import { FaSearch } from "react-icons/fa";

interface BlogSearchProps {
  theme: "light" | "dark";
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const BlogSearch: React.FC<BlogSearchProps> = ({
  theme,
  searchQuery,
  onSearchChange,
}) => (
  <div
    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      theme === "dark"
        ? "bg-gray-800/80 border border-gray-700 focus-within:border-oceanic-500/60 focus-within:bg-gray-800"
        : "bg-white/60 border border-blue-200/40 focus-within:border-blue-400/60 focus-within:bg-white/80"
    }`}
  >
    <FaSearch
      className={`flex-shrink-0 transition-colors duration-300 ${
        theme === "dark" ? "text-gray-500" : "text-slate-500"
      }`}
    />
    <input
      type="text"
      placeholder="Search posts..."
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      className={`flex-1 bg-transparent outline-none placeholder-opacity-60 transition-colors duration-300 ${
        theme === "dark"
          ? "text-white placeholder-slate-400"
          : "text-slate-900 placeholder-slate-500"
      }`}
    />
  </div>
);
