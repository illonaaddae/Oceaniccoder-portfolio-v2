import React, { useCallback } from "react";
import useNavbar from "./useNavbar";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import ThemeToggle from "./ThemeToggle";
import MobileMenuButton from "./MobileMenuButton";
import MobileMenu from "./MobileMenu";

const Navbar = ({ theme, toggleTheme }) => {
  const {
    navItems,
    activeSection,
    setActiveSection,
    isMenuOpen,
    scrolled,
    handleNavClick,
    toggleMenu,
    closeMenu,
  } = useNavbar();

  const onInternalClick = useCallback(
    (id) => {
      setActiveSection(id);
      closeMenu();
    },
    [setActiveSection, closeMenu],
  );

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-300 ${
          scrolled ? "pt-4" : "pt-6"
        }`}
      >
        <div
          className={`px-6 py-3 rounded-full backdrop-blur-xl border shadow-lg transition-all duration-300 max-w-fit ${
            scrolled
              ? theme === "dark"
                ? "bg-black/60 border-white/20 text-white"
                : "bg-white/80 border-gray-200/50 text-slate-900"
              : theme === "dark"
                ? "bg-black/40 border-white/10 text-white"
                : "bg-white/60 border-gray-200/30 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Logo theme={theme} />
            <NavLinks
              navItems={navItems}
              activeSection={activeSection}
              theme={theme}
              onNavClick={handleNavClick}
              onInternalClick={onInternalClick}
            />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <MobileMenuButton
              theme={theme}
              isMenuOpen={isMenuOpen}
              toggleMenu={toggleMenu}
            />
          </div>
        </div>
      </nav>

      <MobileMenu
        navItems={navItems}
        activeSection={activeSection}
        theme={theme}
        isMenuOpen={isMenuOpen}
        onNavClick={handleNavClick}
        onInternalClick={onInternalClick}
        closeMenu={closeMenu}
      />
    </>
  );
};

export default Navbar;
