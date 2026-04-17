import { FaPlus } from "react-icons/fa";

interface ProjectsHeaderProps {
  theme: "light" | "dark";
  isReadOnly: boolean;
  onShowForm?: () => void;
}

export const ProjectsHeader: React.FC<ProjectsHeaderProps> = ({
  theme,
  isReadOnly,
  onShowForm,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
    <div>
      <h1
        className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
          theme === "dark" ? "text-white" : "text-slate-900"
        }`}
      >
        Projects
      </h1>
      <p
        className={`text-sm sm:text-base transition-colors duration-300 ${
          theme === "dark" ? "text-slate-200/90" : "text-slate-700/80"
        }`}
      >
        Manage your portfolio projects
      </p>
    </div>
    {!isReadOnly && (
      <button
        onClick={onShowForm}
        className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold text-sm sm:text-base transition duration-200 border shadow-lg ${
          theme === "dark"
            ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-500 hover:to-oceanic-900 shadow-oceanic-500/20"
            : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-400 hover:to-oceanic-800 shadow-oceanic-500/20"
        }`}
      >
        <FaPlus className="text-sm" />
        Add Project
      </button>
    )}
  </div>
);
