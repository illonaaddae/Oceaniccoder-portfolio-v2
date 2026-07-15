import React from "react";
import { FaGraduationCap, FaBook } from "react-icons/fa";

interface StatusToggleProps {
  isOngoing: boolean;
  onChange: (isOngoing: boolean) => void;
  theme: "light" | "dark";
}

export const StatusToggle: React.FC<StatusToggleProps> = ({ isOngoing, onChange, theme }) => (
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border ${
        isOngoing
          ? "bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white border-oceanic-400 shadow-lg shadow-oceanic-500/20"
          : theme === "dark"
            ? "bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600"
            : "bg-white/50 border-oceanic-200/50 text-slate-600 hover:border-oceanic-300"
      }`}
    >
      <FaBook className="inline-block mr-1" /> In Progress
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border ${
        !isOngoing
          ? "bg-gradient-to-r from-success-500 to-success-700 text-white border-success-400 shadow-lg shadow-success-500/20"
          : theme === "dark"
            ? "bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600"
            : "bg-white/50 border-oceanic-200/50 text-slate-600 hover:border-oceanic-300"
      }`}
    >
      <FaGraduationCap className="inline-block mr-1" /> Completed
    </button>
  </div>
);
