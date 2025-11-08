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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass-navbar-solid backdrop-blur-xl bg-black/40 border-b border-white/10"
          : "glass-navbar-transparent backdrop-blur-sm bg-black/20"
      }`}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Enhanced Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative group">
              {/* Enhanced Logo Container with Glass Effect */}
              <div className="w-12 h-12 glass-card bg-gradient-to-r from-cyan-500/30 to-blue-500/30 backdrop-blur-md border border-cyan-400/40 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:from-cyan-500/40 group-hover:to-blue-500/40 transition-all duration-300 shadow-lg">
                {/* Placeholder for Logo Image */}
                <img
                  src="/images/logo-icon.png"
                  alt="Oceaniccoder Logo"
                  className="w-8 h-8 object-contain filter brightness-0 invert"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  width="32"
                  height="32"
                  onError={(e) => {
                    // Fallback to text if image doesn't exist
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
                {/* Fallback Text Logo */}
                <span className="text-white font-bold text-xl hidden">O</span>
              </div>

              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </div>

            {/* Brand Name Only */}
            <div>
              <h1 className="text-xl font-bold">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 bg-clip-text text-transparent hover:from-cyan-300 hover:via-blue-300 hover:to-teal-300 transition-all duration-300">
                  Oceaniccoder
                </span>
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isInternal = item.href && item.href.startsWith("/");
              const base =
                "nav-link-enhanced px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 relative inline-block";
              const activeCls =
                "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30";
              const inactiveCls =
                "text-gray-300 hover:text-cyan-400 hover:bg-white/5";

              return isInternal ? (
                <NavLink
                  key={item.id}
                  to={item.href}
                  end={item.href === "/"}
                  onClick={() => {
                    // still update context for scroll spy and close menus
                    setActiveSection(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={({ isActive }) =>
                    `${base} ${isActive ? activeCls : inactiveCls}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"></div>
                      )}
                    </>
                  )}
                </NavLink>
              ) : (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.href, item.id)}
                  className={`${base} ${
                    activeSection === item.id ? activeCls : inactiveCls
                  }`}
                >
                  <span>{item.label}</span>
                  {activeSection === item.id && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Enhanced Controls */}
          <div className="flex items-center space-x-3">
            {/* Enhanced Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="glass-btn bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border border-white/20 w-10 h-10 rounded-lg flex items-center justify-center hover:scale-110 hover:from-white/15 hover:to-white/10 transition-all duration-300 shadow-lg"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <FaSun className="w-4 h-4 text-yellow-400" />
              ) : (
                <FaMoon className="w-4 h-4 text-blue-600" />
              )}
            </button>

            {/* Enhanced Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden glass-btn bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border border-white/20 w-10 h-10 rounded-lg flex items-center justify-center hover:scale-110 hover:from-white/15 hover:to-white/10 transition-all duration-300 shadow-lg"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <FaTimes className="w-4 h-4 text-white" />
              ) : (
                <FaBars className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Enhanced Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 glass-card bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const isInternal = item.href && item.href.startsWith("/");
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
                      `nav-link-mobile text-left py-3 px-4 rounded-lg transition-all duration-300 ${
                        isActive
                          ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
                          : "text-gray-300 hover:text-cyan-400 hover:bg-white/5"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.href, item.id)}
                    className={`nav-link-mobile text-left py-3 px-4 rounded-lg transition-all duration-300 ${
                      activeSection === item.id
                        ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
                        : "text-gray-300 hover:text-cyan-400 hover:bg-white/5"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
