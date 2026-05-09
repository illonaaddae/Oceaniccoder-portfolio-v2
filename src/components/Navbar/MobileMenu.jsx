import React from "react";
import { NavLink } from "react-router-dom";
import {
  getMobileActiveClass,
  getMobileInactiveClass,
  MOBILE_BASE_CLASS,
  lightStyle,
} from "./navData";

const MobileMenu = React.memo(function MobileMenu({
  navItems,
  activeSection,
  theme,
  isMenuOpen,
  onNavClick,
  onInternalClick,
  closeMenu,
}) {
  if (!isMenuOpen) return null;

  const activeCls = getMobileActiveClass(theme);
  const inactiveCls = getMobileInactiveClass(theme);
  const style = theme === "light" ? lightStyle : undefined;

  return (
    <>
      {/* Dropdown Panel */}
      <div
        className="lg:hidden fixed top-20 left-0 right-0 z-[60] px-4"
        style={{ touchAction: "manipulation" }}
      >
        <div
          className={`rounded-2xl p-4 shadow-2xl max-h-[calc(100vh-100px)] overflow-y-auto
            backdrop-blur-xl border ${
              theme === "dark"
                ? "bg-black/90 border-white/10"
                : "bg-white/95 border-gray-200/50"
            }`}
        >
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const isInternal = item.href && item.href.startsWith("/");

              return isInternal ? (
                <NavLink
                  key={item.id}
                  to={item.href}
                  end={item.href === "/"}
                  onClick={() => onInternalClick(item.id)}
                  className={({ isActive }) =>
                    `${MOBILE_BASE_CLASS} ${isActive ? activeCls : inactiveCls}`
                  }
                  style={style}
                >
                  {item.label}
                </NavLink>
              ) : (
                <button
                  key={item.id}
                  onClick={() => onNavClick(item.href, item.id)}
                  className={`${MOBILE_BASE_CLASS} w-full ${
                    activeSection === item.id ? activeCls : inactiveCls
                  }`}
                  style={style}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className="lg:hidden fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
        onClick={closeMenu}
        aria-hidden="true"
      />
    </>
  );
});

export default MobileMenu;
