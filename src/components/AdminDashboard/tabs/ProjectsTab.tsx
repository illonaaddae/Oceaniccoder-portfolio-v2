import { useState } from "react";
import {
  FaProjectDiagram,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaExclamationCircle,
} from "react-icons/fa";
import type { Project } from "@/types";

interface ProjectsTabProps {
  theme: "light" | "dark";
  loading: boolean;
  filteredProjects: Project[];
  onDelete: (projectId: string) => Promise<void> | void;
  onEdit?: (project: Project) => void;
  onShowForm?: () => void;
  isReadOnly?: boolean;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  theme,
  loading,
  filteredProjects,
  onDelete,
  onEdit,
  onShowForm,
  isReadOnly = false,
}) => {
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Show toast notification
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle delete with toast
  const handleDeleteProject = async (projectId: string) => {
    try {
      await onDelete(projectId);
      showToast("success", "Project deleted successfully!");
    } catch (error: unknown) {
      // Check if user cancelled the confirmation dialog
      if (error instanceof Error && error.message === "cancelled") {
        // User cancelled - don't show any toast
        return;
      }
      console.error("Failed to delete project:", error);
      showToast("error", "Failed to delete project. Please try again.");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg ${
            toast.type === "success"
              ? theme === "dark"
                ? "bg-green-500/20 border-green-400/50 text-green-300"
                : "bg-green-50 border-green-200 text-green-700"
              : theme === "dark"
              ? "bg-red-500/20 border-red-400/50 text-red-300"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <FaCheckCircle className="text-lg flex-shrink-0" />
          ) : (
            <FaExclamationCircle className="text-lg flex-shrink-0" />
          )}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-black/10 transition-colors"
            aria-label="Dismiss"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>
      )}

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
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500/50 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 border-blue-400/50 text-white hover:from-blue-600 hover:to-cyan-500 shadow-blue-400/30"
            }`}
          >
            <FaPlus className="text-sm" />
            Add Project
          </button>
        )}
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <div
          className={`glass-card border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40 hover:border-blue-200/60 hover:bg-gradient-to-br hover:from-white/50 hover:to-white/30"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                  theme === "dark" ? "text-slate-100/95" : "text-slate-700/80"
                }`}
              >
                Total Projects
              </p>
              <p
                className={`text-4xl font-bold mt-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-white/98" : "text-slate-900"
                }`}
              >
                {filteredProjects.length}
              </p>
            </div>
            <div className="p-3 rounded-xl backdrop-blur-md bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg">
              <FaProjectDiagram className="text-white text-xl font-bold" />
            </div>
          </div>
        </div>

        <div
          className={`glass-card border rounded-2xl p-6 transition-all duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40 hover:border-blue-200/60 hover:bg-gradient-to-br hover:from-white/50 hover:to-white/30"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-slate-700/80"
                }`}
              >
                Published
              </p>
              <p
                className={`text-4xl font-bold mt-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                {
                  filteredProjects.filter(
                    (p) => p.status === "published" || p.featured
                  ).length
                }
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-green-500 shadow-lg">
              <FaCheckCircle className="text-white text-xl font-bold" />
            </div>
          </div>
        </div>

        <div
          className={`glass-card border rounded-2xl p-6 transition-all duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40 hover:border-blue-200/60 hover:bg-gradient-to-br hover:from-white/50 hover:to-white/30"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-slate-700/80"
                }`}
              >
                Drafts
              </p>
              <p
                className={`text-4xl font-bold mt-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                {filteredProjects.filter((p) => p.status === "draft").length}
              </p>
            </div>
            <div className="p-3 rounded-xl backdrop-blur-md bg-gradient-to-br from-orange-600 to-orange-500 shadow-lg">
              <FaClock className="text-white text-xl font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div
        className={`glass-card backdrop-blur-xl border rounded-2xl p-5 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
          theme === "dark"
            ? "bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-400/20"
            : "bg-gradient-to-br from-blue-50/60 to-cyan-50/40 border-blue-200/60"
        }`}
      >
        <div className="flex-1 w-full sm:w-auto relative">
          <div
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50 transition-opacity duration-300 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search projects, skills..."
            className={`w-full pl-10 pr-4 py-3 rounded-xl transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 ${
              theme === "dark"
                ? "bg-white/10 border-white/20 text-white placeholder-slate-400 hover:bg-white/15"
                : "bg-white/40 border-blue-200/50 text-slate-900 placeholder-slate-600 hover:bg-white/50"
            }`}
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <select
            title="Filter by project status"
            className={`flex-1 sm:flex-none px-4 py-3 rounded-xl transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm font-medium ${
              theme === "dark"
                ? "bg-white/10 border-white/20 text-white hover:bg-white/15"
                : "bg-white/40 border-blue-200/50 text-slate-900 hover:bg-white/50"
            }`}
          >
            <option>All Status</option>
            <option>Published</option>
            <option>Draft</option>
            <option>Archived</option>
          </select>
          <select
            title="Filter by technology"
            className={`flex-1 sm:flex-none px-4 py-3 rounded-xl transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm font-medium ${
              theme === "dark"
                ? "bg-white/10 border-white/20 text-white hover:bg-white/15"
                : "bg-white/40 border-blue-200/50 text-slate-900 hover:bg-white/50"
            }`}
          >
            <option>All Tech</option>
            <option>React</option>
            <option>Vue</option>
            <option>Node.js</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="text-center py-12">
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Loading projects...
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div
          className={`glass-card backdrop-blur-xl border rounded-2xl p-12 text-center transition-colors duration-300 ${
            theme === "dark"
              ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <FaProjectDiagram
            className={`text-4xl mx-auto mb-4 transition-colors duration-300 ${
              theme === "dark" ? "text-slate-400/50" : "text-slate-400/60"
            }`}
          />
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            No projects yet
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {filteredProjects.map((project) => (
              <div
                key={project.$id}
                className={`glass-card backdrop-blur-xl border rounded-xl p-4 transition-colors duration-300 ${
                  theme === "dark"
                    ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
                    : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <FaProjectDiagram className="text-white text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`font-bold text-sm truncate ${
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {project.title}
                      </h3>
                      <p
                        className={`text-xs truncate ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {project.description?.substring(0, 40)}...
                      </p>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => onEdit?.(project)}
                        className={`p-2 rounded-lg transition ${
                          theme === "dark"
                            ? "text-cyan-300 hover:bg-white/10"
                            : "text-blue-600 hover:bg-white/30"
                        }`}
                        title="Edit project"
                      >
                        <FaEdit className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.$id)}
                        className={`p-2 rounded-lg transition ${
                          theme === "dark"
                            ? "text-red-400 hover:bg-white/10"
                            : "text-red-600 hover:bg-white/30"
                        }`}
                        title="Delete project"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Badges */}
                <div className="flex gap-2 flex-wrap mb-3">
                  {project.featured && (
                    <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Featured
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      project.status === "published" ||
                      project.status === "Completed"
                        ? "text-green-400 bg-green-400/10 border-green-400/30"
                        : project.status === "draft" ||
                          project.status === "In Progress"
                        ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
                        : project.status === "Planning"
                        ? "text-blue-400 bg-blue-400/10 border-blue-400/30"
                        : "text-gray-400 bg-gray-400/10 border-gray-400/30"
                    }`}
                  >
                    {project.status === "published"
                      ? "Completed"
                      : project.status || "Draft"}
                  </span>
                </div>

                {/* Technologies */}
                <div className="flex gap-1.5 flex-wrap">
                  {project.technologies?.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className={`text-xs px-2 py-0.5 rounded backdrop-blur-sm border ${
                        theme === "dark"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-white/40 border-blue-200/40 text-slate-900"
                      }`}
                    >
                      {tech}
                    </span>
                  ))}
                  {project.technologies && project.technologies.length > 3 && (
                    <span
                      className={`text-xs px-2 py-0.5 ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      +{project.technologies.length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div
            className={`hidden md:block glass-card backdrop-blur-xl border rounded-2xl overflow-hidden transition-colors duration-300 ${
              theme === "dark"
                ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
                : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={`border-b transition-colors duration-300 ${
                      theme === "dark"
                        ? "border-white/20"
                        : "border-blue-200/40"
                    }`}
                  >
                    <th
                      className={`px-4 py-4 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                        theme === "dark" ? "text-white/95" : "text-slate-700/90"
                      }`}
                    >
                      Project Name
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                        theme === "dark" ? "text-white/95" : "text-slate-700/90"
                      }`}
                    >
                      Status
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                        theme === "dark" ? "text-white/95" : "text-slate-700/90"
                      }`}
                    >
                      Technologies
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                        theme === "dark" ? "text-white/95" : "text-slate-700/90"
                      }`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y transition-colors duration-300 ${
                    theme === "dark" ? "divide-white/5" : "divide-blue-200/20"
                  }`}
                >
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.$id}
                      className={`transition-all duration-300 border-b ${
                        theme === "dark"
                          ? "border-white/5 hover:bg-white/5"
                          : "border-blue-200/20 hover:bg-white/20"
                      }`}
                    >
                      <td
                        className={`px-4 py-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <FaProjectDiagram className="text-white text-sm" />
                          </div>
                          <div>
                            <span className="font-bold text-sm">
                              {project.title}
                            </span>
                            <p
                              className={`text-xs transition-colors duration-300 ${
                                theme === "dark"
                                  ? "text-slate-400"
                                  : "text-slate-500"
                              }`}
                            >
                              {project.description?.substring(0, 30)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 flex-wrap">
                          {/* Featured Badge - matches live site styling */}
                          {project.featured && (
                            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                              Featured
                            </span>
                          )}
                          {/* Status Badge - matches live site styling */}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              project.status === "published" ||
                              project.status === "Completed"
                                ? "text-green-400 bg-green-400/10 border-green-400/30"
                                : project.status === "draft" ||
                                  project.status === "In Progress"
                                ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
                                : project.status === "Planning"
                                ? "text-blue-400 bg-blue-400/10 border-blue-400/30"
                                : "text-gray-400 bg-gray-400/10 border-gray-400/30"
                            }`}
                          >
                            {project.status === "published"
                              ? "Completed"
                              : project.status || "Draft"}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-4 text-sm font-medium transition-colors duration-300 ${
                          theme === "dark"
                            ? "text-slate-200/90"
                            : "text-slate-700/90"
                        }`}
                      >
                        <div className="flex gap-2">
                          {project.technologies &&
                            project.technologies.slice(0, 2).map((tech) => (
                              <span
                                key={tech}
                                className={`text-xs px-2 py-1 rounded backdrop-blur-sm border transition-colors duration-300 ${
                                  theme === "dark"
                                    ? "bg-white/10 border-white/20 text-white"
                                    : "bg-white/40 border-blue-200/40 text-slate-900"
                                }`}
                              >
                                {tech}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {!isReadOnly && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onEdit?.(project)}
                              className={`p-2 rounded-lg transition ${
                                theme === "dark"
                                  ? "text-cyan-300 hover:bg-white/10"
                                  : "text-blue-600 hover:bg-white/30"
                              }`}
                              title="Edit project"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project.$id)}
                              className={`p-2 rounded-lg transition ${
                                theme === "dark"
                                  ? "text-red-400 hover:bg-white/10"
                                  : "text-red-600 hover:bg-white/30"
                              }`}
                              title="Delete project"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
