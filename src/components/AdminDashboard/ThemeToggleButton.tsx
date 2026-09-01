import React from "react";
import { FaMoon, FaSun } from "react-icons/fa";

interface ThemeToggleButtonProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

/**
 * Header theme control, sitting beside the notifications bell.
 *
 * The sidebar footer keeps its own toggle: on the icon-only rail and on
 * mobile the footer is where the account controls live, and removing it would
 * strand anyone who has the sidebar collapsed. Both drive the same state.
 */
export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ theme, onToggle }) => {
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 flex-shrink-0 ${
        isDark
          ? "bg-gray-800/80 border border-gray-700 text-amber-300 hover:bg-gray-700/80 hover:border-gray-600"
          : "bg-white/60 border border-oceanic-200/40 text-oceanic-700 hover:bg-white/90 hover:border-oceanic-300/60"
      }`}
    >
      {isDark ? <FaSun className="text-base" /> : <FaMoon className="text-base" />}
    </button>
  );
};
