import { FaPlus, FaCheck } from "react-icons/fa";

interface OverviewHeaderProps {
  theme: "light" | "dark";
  isReadOnly: boolean;
  onAddCertification?: () => void;
  onNewProject?: () => void;
}

export const OverviewHeader: React.FC<OverviewHeaderProps> = ({
  theme,
  isReadOnly,
  onAddCertification,
  onNewProject,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1
        className={`text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 transition-colors duration-300 ${
          theme === "dark" ? "text-white/95" : "text-slate-900"
        }`}
      >
        Dashboard Overview
      </h1>
      <p
        className={`text-xs xs:text-sm sm:text-base transition-colors duration-300 ${
          theme === "dark" ? "text-slate-100/90" : "text-slate-700/90"
        }`}
      >
        {isReadOnly
          ? "Welcome! Here's an overview of my portfolio."
          : "Welcome back, here's what's happening with your portfolio today."}
      </p>
    </div>
    {!isReadOnly && (
      <div className="flex flex-wrap gap-2 xs:gap-2 sm:gap-3">
        <button
          onClick={onAddCertification}
          className={`flex items-center gap-1.5 xs:gap-2 px-2.5 xs:px-3 sm:px-5 py-1.5 xs:py-2 rounded-lg xs:rounded-xl font-bold text-xs xs:text-sm sm:text-base transition duration-200 border ${
            theme === "dark"
              ? "bg-gray-800/80 border-gray-700 text-gray-200 hover:bg-gray-800 hover:border-gray-600"
              : "bg-white/40 border-blue-200/40 text-slate-900 hover:bg-white/60 hover:border-blue-200/60"
          }`}
        >
          <FaCheck className="text-xs xs:text-sm" />
          <span className="hidden xs:inline">Add</span> Cert
        </button>
        <button
          onClick={onNewProject}
          className={`flex items-center gap-1.5 xs:gap-2 px-2.5 xs:px-3 sm:px-5 py-1.5 xs:py-2 rounded-lg xs:rounded-xl font-medium text-xs xs:text-sm sm:text-base transition duration-200 border shadow-lg ${
            theme === "dark"
              ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-500 hover:to-oceanic-900 shadow-oceanic-500/20"
              : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-400 hover:to-oceanic-800 shadow-oceanic-500/20"
          }`}
        >
          <FaPlus className="text-xs xs:text-sm" />
          <span className="hidden xs:inline">New</span> Project
        </button>
      </div>
    )}
  </div>
);
