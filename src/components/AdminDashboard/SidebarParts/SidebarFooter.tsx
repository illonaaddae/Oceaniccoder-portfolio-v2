import { FaMoon, FaSun, FaSignOutAlt } from "react-icons/fa";

interface SidebarFooterProps {
  theme: string;
  isReadOnly: boolean;
  onThemeToggle: () => void;
  onLogout?: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  theme,
  isReadOnly,
  onThemeToggle,
  onLogout,
}) => {
  return (
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
  );
};
