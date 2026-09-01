import { FaSignOutAlt } from "react-icons/fa";

interface SidebarFooterProps {
  theme: string;
  isReadOnly: boolean;
  onLogout?: () => void;
  isCollapsed?: boolean;
}

/**
 * The theme control moved to the header, beside the notifications bell. The
 * header sits in <main>, so it stays reachable when the sidebar is collapsed
 * to its icon rail and when it is closed on mobile — which is what made the
 * copy down here redundant rather than a fallback. Sign out now has the footer
 * to itself.
 */
export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  theme,
  isReadOnly,
  onLogout,
  isCollapsed = false,
}) => {
  return (
    <div
      className={`flex-shrink-0 border-t p-4 pb-safe space-y-3 relative z-20 pointer-events-auto ${
        theme === "dark" ? "bg-[#0d1321] border-gray-800" : "bg-white/30 border-oceanic-200/30"
      }`}
    >
      {/* Read-only badge for public viewers */}
      {isReadOnly && (
        <div
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
            isCollapsed ? "lg:px-0" : ""
          } ${
            theme === "dark"
              ? "bg-oceanic-500/20 text-oceanic-300 border border-oceanic-500/30"
              : "bg-oceanic-100 text-oceanic-700 border border-oceanic-200"
          }`}
        >
          <span>👁️</span>
          <span className={isCollapsed ? "lg:hidden" : ""}>View Only Mode</span>
        </div>
      )}

      {/* Only show logout for admin users */}
      {!isReadOnly && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLogout?.();
          }}
          type="button"
          title="Logout"
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 border touch-manipulation min-h-[44px] cursor-pointer select-none ${
            isCollapsed ? "lg:justify-center lg:gap-0 lg:px-0" : ""
          } ${
            theme === "dark"
              ? "text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/30 active:bg-red-500/20"
              : "text-red-600 hover:bg-red-50 border-transparent hover:border-red-200 active:bg-red-100"
          }`}
        >
          <FaSignOutAlt />
          <span className={`font-medium ${isCollapsed ? "lg:hidden" : ""}`}>Logout</span>
        </button>
      )}
    </div>
  );
};
