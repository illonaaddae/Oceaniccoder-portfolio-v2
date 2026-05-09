import React from "react";
import { FaBars, FaTimes } from "react-icons/fa";

const MobileMenuButton = React.memo(function MobileMenuButton({
  theme,
  isMenuOpen,
  toggleMenu,
}) {
  return (
    <button
      onClick={toggleMenu}
      className={`
        lg:hidden ml-1 w-9 h-9 rounded-full flex items-center justify-center
        transition-all duration-300 hover:scale-110
        ${
          theme === "dark"
            ? "bg-white/10 hover:bg-white/20 text-white"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }
      `}
      aria-label="Toggle menu"
      aria-expanded={isMenuOpen}
    >
      {isMenuOpen ? (
        <FaTimes className="w-4 h-4" />
      ) : (
        <FaBars className="w-4 h-4" />
      )}
    </button>
  );
});

export default MobileMenuButton;
