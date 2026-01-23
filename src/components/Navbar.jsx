import React, { useState, useEffect } from "react";
import { FaSun, FaMoon, FaBars, FaTimes } from "react-icons/fa";
import { usePortfolio } from "../Context";
import { NavLink, useNavigate } from "react-router-dom";

const Navbar = ({ theme, toggleTheme }) => {
  const {
    navItems,
    activeSection,
    setActiveSection,
    isMenuOpen,
    setIsMenuOpen,
  } = usePortfolio();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigate = useNavigate();

  const handleNavClick = (href, id) => {
    setActiveSection(id);
    setIsMenuOpen(false);

    // External link -> open new tab
    try {
      const isExternal = /^(https?:)?\/\//i.test(href);
      if (isExternal) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
    } catch (e) {}

    // Internal route -> navigate
    if (href && href.startsWith("/")) {
      navigate(href);
    }
  };

  return (
    <>
      {/* Floating Pill Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-300 ${
          scrolled ? "pt-4" : "pt-6"
        }`}
      >
        <div
          className={`
            px-6 py-3 rounded-full
            backdrop-blur-xl
            border
            shadow-lg
            transition-all duration-300
            max-w-fit
            ${
              scrolled
                ? theme === "dark"
                  ? "bg-black/60 border-white/20 text-white"
                  : "bg-white/80 border-gray-200/50 text-slate-900"
                : theme === "dark"
                  ? "bg-black/40 border-white/10 text-white"
                  : "bg-white/60 border-gray-200/30 text-slate-900"
            }
          `}
        >
          <div className="flex items-center gap-2">
            {/* Logo */}
            <div className="group mr-4">
              <img
                src={
                  theme === "dark"
                    ? "/images/logo/Oceaniccoder-croped.svg"
                    : "/images/logo/Oceaniccoder-croped.png"
                }
                alt="Oceaniccoder"
                className={`h-8 w-auto object-contain group-hover:scale-105 transition-transform duration-300 ${
                  theme === "dark"
                    ? "brightness-0 invert sepia saturate-[5] hue-rotate-[175deg]"
                    : ""
                }`}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isInternal = item.href && item.href.startsWith("/");
                const base =
                  "px-3 py-2 text-sm font-medium rounded-full transition-all duration-300";
                const activeCls =
                  theme === "dark"
                    ? "text-cyan-400 bg-cyan-500/20"
                    : "text-cyan-600 bg-cyan-50";
                const inactiveCls =
                  theme === "dark"
                    ? "text-gray-300 hover:text-cyan-400 hover:bg-white/10"
                    : "text-slate-900 hover:text-cyan-600 hover:bg-gray-100";

                return isInternal ? (
                  <NavLink
                    key={item.id}
                    to={item.href}
                    end={item.href === "/"}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={({ isActive }) =>
                      `${base} ${isActive ? activeCls : inactiveCls}`
                    }
                    style={theme === "light" ? { color: "#0f172a" } : undefined}
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.href, item.id)}
                    className={`${base} ${
                      activeSection === item.id ? activeCls : inactiveCls
                    }`}
                    style={theme === "light" ? { color: "#0f172a" } : undefined}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`
                ml-2 w-9 h-9 rounded-full flex items-center justify-center
                transition-all duration-300 hover:scale-110
                ${
                  theme === "dark"
                    ? "bg-white/10 hover:bg-white/20 text-yellow-400"
                    : "bg-gray-100 hover:bg-gray-200 text-blue-600"
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

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
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
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed top-20 left-0 right-0 z-[60] px-4"
          style={{ touchAction: "manipulation" }}
        >
          <div
            className={`
              rounded-2xl p-4 shadow-2xl max-h-[calc(100vh-100px)] overflow-y-auto
              backdrop-blur-xl border
              ${
                theme === "dark"
                  ? "bg-black/90 border-white/10"
                  : "bg-white/95 border-gray-200/50"
              }
            `}
          >
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const isInternal = item.href && item.href.startsWith("/");
                const activeCls =
                  theme === "dark"
                    ? "text-cyan-400 bg-cyan-500/20 border border-cyan-500/30"
                    : "text-cyan-600 bg-cyan-50 border border-cyan-200";
                const inactiveCls =
                  theme === "dark"
                    ? "text-gray-200 hover:text-cyan-400 hover:bg-white/10"
                    : "text-slate-900 hover:text-cyan-600 hover:bg-gray-100";

                return isInternal ? (
                  <NavLink
                    key={item.id}
                    to={item.href}
                    end={item.href === "/"}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={({ isActive }) =>
                      `text-left py-3 px-4 rounded-xl transition-all duration-300 ${
                        isActive ? activeCls : inactiveCls
                      }`
                    }
                    style={theme === "light" ? { color: "#0f172a" } : undefined}
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.href, item.id)}
                    className={`text-left py-3 px-4 rounded-xl transition-all duration-300 w-full ${
                      activeSection === item.id ? activeCls : inactiveCls
                    }`}
                    style={theme === "light" ? { color: "#0f172a" } : undefined}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Navbar;
