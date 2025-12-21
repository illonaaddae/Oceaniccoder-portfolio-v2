import {
  FaSignOutAlt,
  FaBell,
  FaSearch,
  FaEnvelope,
  FaCode,
  FaProjectDiagram,
  FaFileAlt,
  FaCog,
  FaMoon,
  FaSun,
  FaChartBar,
  FaImage,
  FaGraduationCap,
  FaRoad,
  FaUser,
  FaBars,
  FaTimes,
  FaBlog,
  FaComments,
} from "react-icons/fa";
import { useState } from "react";

type TabType =
  | "overview"
  | "messages"
  | "comments"
  | "skills"
  | "projects"
  | "certifications"
  | "gallery"
  | "education"
  | "journey"
  | "about"
  | "blog"
  | "settings";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: TabType) => void;
  theme: string | "light" | "dark";
  onThemeToggle: () => void;
  onLogout?: () => void;
  isReadOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  theme,
  onThemeToggle,
  onLogout,
  isReadOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Define tabs - filter out settings for read-only users
  const allTabs: Array<{
    id: TabType;
    label: string;
    icon: typeof FaChartBar;
  }> = [
    { id: "overview", label: "Overview", icon: FaChartBar },
    { id: "messages", label: "Messages", icon: FaEnvelope },
    { id: "comments", label: "Comments", icon: FaComments },
    { id: "about", label: "About Me", icon: FaUser },
    { id: "skills", label: "Skills", icon: FaCode },
    { id: "projects", label: "Projects", icon: FaProjectDiagram },
    { id: "certifications", label: "Certifications", icon: FaFileAlt },
    { id: "blog", label: "Blog Posts", icon: FaBlog },
    { id: "education", label: "Education", icon: FaGraduationCap },
    { id: "journey", label: "Journey", icon: FaRoad },
    { id: "gallery", label: "Gallery", icon: FaImage },
    { id: "settings", label: "Settings", icon: FaCog },
  ];

  // Filter out settings tab for read-only users (public access)
  const tabs = isReadOnly
    ? allTabs.filter((tab) => tab.id !== "settings")
    : allTabs;

  const handleTabChange = (tab: TabType) => {
    onTabChange(tab);
    setIsOpen(false); // Close mobile menu on tab change
  };

  return (
    <>
      {/* Mobile Menu Button - positioned to avoid overlapping sidebar content */}
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
        {/* Header with Profile */}
        <div
          className={`flex-shrink-0 p-4 sm:p-6 pt-14 lg:pt-6 border-b ${
            theme === "dark" ? "border-gray-800" : "border-blue-200/30"
          }`}
        >
          {/* Profile Image */}
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 flex-shrink-0 ${
                theme === "dark"
                  ? "border-cyan-500/60 ring-2 ring-cyan-500/20"
                  : "border-blue-400/50 ring-2 ring-blue-500/30"
              }`}
            >
              <img
                src="https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444ceb001c1eda1331/view?project=6943431e00253c8f9883"
                alt="Admin Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to initials if image fails
                  (e.target as HTMLImageElement).style.display = "none";
                  (
                    e.target as HTMLImageElement
                  ).nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div
                className={`w-full h-full items-center justify-center text-xl font-bold ${
                  theme === "dark"
                    ? "bg-gradient-to-br from-cyan-500/40 to-blue-500/40 text-white"
                    : "bg-gradient-to-br from-blue-400/40 to-cyan-400/40 text-slate-800"
                }`}
                style={{ display: "none" }}
              >
                OC
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold truncate transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                Oceaniccoder
              </h3>
              <p
                className={`text-xs truncate transition-colors duration-300 ${
                  theme === "dark" ? "text-cyan-400" : "text-blue-600"
                }`}
              >
                Administrator
              </p>
            </div>
          </div>
          <h2
            className={`text-xl font-bold transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Admin Panel
          </h2>
          <p
            className={`text-sm transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Manage your portfolio
          </p>
        </div>

        {/* Navigation - scrollable area with proper constraints */}
        <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-2.5 rounded-xl transition-all duration-200 touch-manipulation min-h-[44px] ${
                  isActive
                    ? theme === "dark"
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                      : "bg-gradient-to-r from-blue-400/30 to-cyan-400/20 border border-blue-300/50 text-blue-700 shadow-lg shadow-blue-200/20"
                    : theme === "dark"
                    ? "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 border border-transparent active:bg-gray-700/80"
                    : "text-slate-600 hover:bg-white/40 hover:text-slate-900 active:bg-white/60"
                }`}
              >
                <Icon
                  className={`text-base flex-shrink-0 ${
                    isActive
                      ? theme === "dark"
                        ? "text-cyan-400"
                        : "text-blue-600"
                      : ""
                  }`}
                />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer - ensure it's always visible and clickable */}
        <div
          className={`flex-shrink-0 border-t p-4 pb-safe space-y-3 relative z-20 pointer-events-auto ${
            theme === "dark"
              ? "bg-[#0d1321] border-gray-800"
              : "bg-white/30 border-blue-200/30"
          }`}
        >
          {/* Read-only badge for public viewers */}
          {isReadOnly && (
            <div
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                theme === "dark"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              <span>👁️</span>
              <span>View Only Mode</span>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onThemeToggle();
            }}
            type="button"
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 touch-manipulation min-h-[44px] cursor-pointer select-none ${
              theme === "dark"
                ? "bg-gray-800/80 text-amber-400 hover:bg-gray-800 border border-gray-700 hover:border-amber-500/40 active:bg-gray-700"
                : "bg-white/50 text-slate-700 hover:bg-white/70 border border-blue-200/30 hover:border-blue-300/50 active:bg-white/90"
            }`}
          >
            {theme === "dark" ? (
              <FaSun className="text-amber-400" />
            ) : (
              <FaMoon className="text-slate-600" />
            )}
            <span className="font-medium">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          {/* Only show logout for admin users */}
          {!isReadOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLogout?.();
              }}
              type="button"
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 border touch-manipulation min-h-[44px] cursor-pointer select-none ${
                theme === "dark"
                  ? "text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/30 active:bg-red-500/20"
                  : "text-red-600 hover:bg-red-50 border-transparent hover:border-red-200 active:bg-red-100"
              }`}
            >
              <FaSignOutAlt />
              <span className="font-medium">Logout</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
