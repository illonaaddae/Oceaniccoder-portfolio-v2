import React from "react";
import { FaGraduationCap, FaBook } from "react-icons/fa";

interface StatusToggleProps {
  isOngoing: boolean;
  onChange: (isOngoing: boolean) => void;
  theme: "light" | "dark";
}

export const StatusToggle: React.FC<StatusToggleProps> = ({
  isOngoing,
  onChange,
  theme,
}) => (
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border ${
        isOngoing
          ? "bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white border-blue-400 shadow-lg shadow-blue-500/20"
          : theme === "dark"
            ? "bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600"
            : "bg-white/50 border-blue-200/50 text-slate-600 hover:border-blue-300"
      }`}
    >
      <FaBook className="inline-block mr-1" /> In Progress
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border ${
        !isOngoing
          ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-white border-emerald-400 shadow-lg shadow-emerald-500/20"
          : theme === "dark"
            ? "bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600"
            : "bg-white/50 border-blue-200/50 text-slate-600 hover:border-blue-300"
      }`}
    >
      <FaGraduationCap className="inline-block mr-1" /> Completed
    </button>
  </div>
);
