import React from "react";
import { FaSun, FaMoon } from "react-icons/fa";

const ThemeToggle = React.memo(function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      className={`
        ml-2 w-9 h-9 rounded-full flex items-center justify-center
        transition-all duration-300 hover:scale-110
        ${
          theme === "dark"
            ? "bg-white/10 hover:bg-white/20 text-yellow-400"
            : "bg-gray-100 hover:bg-gray-200 text-oceanic-600"
        }
      `}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <FaSun className="w-4 h-4" />
      ) : (
        <FaMoon className="w-4 h-4" />
      )}
    </button>
  );
});

export default ThemeToggle;
