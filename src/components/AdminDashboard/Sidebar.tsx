import React, { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { SidebarHeader } from "./SidebarParts/SidebarHeader";
import { SidebarNav } from "./SidebarParts/SidebarNav";
import { SidebarFooter } from "./SidebarParts/SidebarFooter";
import { allTabs } from "./SidebarParts/tabs";
import type { SidebarProps } from "./SidebarParts/types";
import type { TabType } from "./SidebarParts/types";

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  theme,
  onThemeToggle,
  onLogout,
  isReadOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const tabs = isReadOnly
    ? allTabs.filter((tab) => tab.id !== "settings")
    : allTabs;

  const handleTabChange = (tab: TabType) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`lg:hidden fixed top-3 left-3 z-[60] p-2.5 rounded-lg backdrop-blur-xl border transition-all duration-300 touch-manipulation ${
          theme === "dark"
            ? "bg-slate-900/90 border-white/20 text-white hover:bg-slate-800/90 active:bg-slate-700/90"
            : "bg-white/90 border-blue-200/40 text-slate-900 hover:bg-white active:bg-gray-100"
        } shadow-lg`}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? (
          <FaTimes className="text-lg" />
        ) : (
          <FaBars className="text-lg" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[45]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-[100dvh] w-64 flex flex-col transition-all duration-300 ${
          theme === "dark"
            ? "bg-[#111827] border-r border-gray-800 shadow-xl shadow-black/30"
            : "bg-gradient-to-b from-white/80 to-white/60 border-r border-blue-200/30 shadow-xl shadow-blue-100/10"
        } backdrop-blur-xl z-[50] ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <SidebarHeader theme={theme} />
        <SidebarNav
          tabs={tabs}
          activeTab={activeTab}
          theme={theme}
          onTabChange={handleTabChange}
        />
        <SidebarFooter
          theme={theme}
          isReadOnly={isReadOnly}
          onThemeToggle={onThemeToggle}
          onLogout={onLogout}
        />
      </aside>
    </>
  );
};
