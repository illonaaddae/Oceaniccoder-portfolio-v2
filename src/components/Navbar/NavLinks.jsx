import React from "react";
import { NavLink } from "react-router-dom";
import {
  NAV_BASE_CLASS,
  getNavActiveClass,
  getNavInactiveClass,
  lightStyle,
} from "./navData";

const NavLinks = React.memo(function NavLinks({
  navItems,
  activeSection,
  theme,
  onNavClick,
  onInternalClick,
}) {
  const activeCls = getNavActiveClass(theme);
  const inactiveCls = getNavInactiveClass(theme);
  const style = theme === "light" ? lightStyle : undefined;

  return (
    <div className="hidden lg:flex items-center gap-1">
      {navItems.map((item) => {
        const isInternal = item.href && item.href.startsWith("/");

        return isInternal ? (
          <NavLink
            key={item.id}
            to={item.href}
            end={item.href === "/"}
            onClick={() => onInternalClick(item.id)}
            className={({ isActive }) =>
              `${NAV_BASE_CLASS} ${isActive ? activeCls : inactiveCls}`
            }
            style={style}
          >
            {item.label}
          </NavLink>
        ) : (
          <button
            key={item.id}
            onClick={() => onNavClick(item.href, item.id)}
            className={`${NAV_BASE_CLASS} ${
              activeSection === item.id ? activeCls : inactiveCls
            }`}
            style={style}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
});

export default NavLinks;
