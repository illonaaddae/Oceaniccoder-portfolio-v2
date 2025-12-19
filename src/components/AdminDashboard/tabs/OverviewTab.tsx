import { useState, useEffect } from "react";
import {
  FaFolder,
  FaCode,
  FaAward,
  FaImage,
  FaPlus,
  FaCheck,
  FaChartLine,
  FaEnvelope,
} from "react-icons/fa";
import type { Skill, Message, Project } from "@/types";
import { getStorageStats, type StorageStats } from "@/services/api";
import { formatRelativeTime } from "@/utils/formatters";

interface OverviewTabProps {
  theme: "light" | "dark";
  totalProjects: number;
  filteredSkills: Skill[];
  totalCertifications: number;
  totalGallery: number;
  newMessages: number;
  recentMessages?: Message[];
  recentProjects?: Project[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onNewProject?: () => void;
  onAddCertification?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  theme,
  totalProjects,
  filteredSkills,
  totalCertifications,
  totalGallery,
  newMessages,
  recentMessages = [],
  recentProjects = [],
  searchQuery = "",
  onSearchChange = () => {},
  onNewProject,
  onAddCertification,
  onNavigateToTab,
}) => {
  // Storage stats state
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalFiles: 0,
    totalSizeBytes: 0,
    totalSizeMB: 0,
    usedPercentage: 0,
    maxStorageMB: 2048,
  });

  // Fetch storage stats on mount
  useEffect(() => {
    const fetchStorageStats = async () => {
      const stats = await getStorageStats();
      setStorageStats(stats);
    };
    fetchStorageStats();
  }, []);

  const stats = [
    {
      label: "Total Projects",
      value: totalProjects,
      change: "+2 this mo",
      icon: FaFolder,
      bgGradient: "from-blue-600 to-blue-500",
      tabLink: "projects",
    },
    {
      label: "Active Skills",
      value: filteredSkills.length,
      change: `Across ${
        new Set(filteredSkills.map((s) => s.category)).size
      } categories`,
      icon: FaCode,
      bgGradient: "from-purple-600 to-purple-500",
      tabLink: "skills",
    },
    {
      label: "Certifications",
      value: totalCertifications,
      change: "Latest: AWS Cloud",
      icon: FaAward,
      bgGradient: "from-amber-600 to-amber-500",
      tabLink: "certifications",
    },
    {
      label: "Gallery Items",
      value: totalGallery,
      change: `${storageStats.totalFiles} files`,
      icon: FaImage,
      bgGradient: "from-green-600 to-green-500",
      tabLink: "gallery",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
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
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-100/90" : "text-slate-700/90"
            }`}
          >
            Welcome back, here's what's happening with your portfolio today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={onAddCertification}
            className={`flex items-center gap-2 px-3 sm:px-6 py-2 rounded-xl font-bold text-sm sm:text-base transition duration-200 border ${
              theme === "dark"
                ? "bg-gray-800/80 border-gray-700 text-gray-200 hover:bg-gray-800 hover:border-gray-600"
                : "bg-white/40 border-blue-200/40 text-slate-900 hover:bg-white/60 hover:border-blue-200/60"
            }`}
          >
            <FaCheck className="text-sm" />
            <span className="hidden xs:inline">Add</span> Certification
          </button>
          <button
            onClick={onNewProject}
            className={`flex items-center gap-2 px-3 sm:px-6 py-2 rounded-xl font-medium text-sm sm:text-base transition duration-200 border shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500/50 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 border-blue-400/50 text-white hover:from-blue-600 hover:to-cyan-500 shadow-blue-400/30"
            }`}
          >
            <FaPlus className="text-sm" />
            <span className="hidden xs:inline">New</span> Project
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, idx) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => stat.tabLink && onNavigateToTab?.(stat.tabLink)}
              className={`glass-card border rounded-xl sm:rounded-2xl p-3 sm:p-6 transition-all duration-200 ${
                stat.tabLink ? "cursor-pointer hover:scale-[1.02]" : ""
              } ${
                theme === "dark"
                  ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600 hover:bg-gray-800/70"
                  : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40 hover:border-blue-200/60 hover:bg-gradient-to-br hover:from-white/50 hover:to-white/30"
              }`}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-4">
                <div>
                  <p
                    className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-slate-700/80"
                    }`}
                  >
                    {stat.label}
                  </p>
                  <p
                    className={`text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-white/98" : "text-slate-900"
                    }`}
                  >
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`p-2 sm:p-3 rounded-lg sm:rounded-xl backdrop-blur-md bg-gradient-to-br ${stat.bgGradient} shadow-lg`}
                >
                  <IconComponent className="text-white text-sm sm:text-xl font-bold" />
                </div>
              </div>
              <div
                className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 backdrop-blur-sm border ${
                  idx === 0
                    ? theme === "dark"
                      ? "bg-blue-500/20 text-blue-300 border-blue-400/30 hover:bg-blue-500/30"
                      : "bg-blue-100 text-blue-700 border-blue-200/60 hover:bg-blue-150"
                    : idx === 1
                    ? theme === "dark"
                      ? "bg-purple-500/20 text-purple-300 border-purple-400/30 hover:bg-purple-500/30"
                      : "bg-purple-100 text-purple-700 border-purple-200/60 hover:bg-purple-150"
                    : idx === 2
                    ? theme === "dark"
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/30 hover:bg-amber-500/30"
                      : "bg-amber-100 text-amber-700 border-amber-200/60 hover:bg-amber-150"
                    : theme === "dark"
                    ? "bg-green-500/20 text-green-300 border-green-400/30 hover:bg-green-500/30"
                    : "bg-green-100 text-green-700 border-green-200/60 hover:bg-green-150"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    idx === 0
                      ? "bg-blue-400"
                      : idx === 1
                      ? "bg-purple-400"
                      : idx === 2
                      ? "bg-amber-400"
                      : "bg-green-400"
                  }`}
                />
                {stat.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity and Storage/Views - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Activity - Left Column (2/3 width) */}
        <div
          className={`lg:col-span-2 glass-card border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-colors duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2
              className={`text-base sm:text-lg font-bold transition-colors duration-300 ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              <FaChartLine className="inline mr-2" />
              Recent Activity
            </h2>
            <button
              onClick={() => onNavigateToTab?.("projects")}
              className={`text-sm font-bold transition-colors duration-200 ${
                theme === "dark"
                  ? "text-cyan-400 hover:text-cyan-300"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              View all
            </button>
          </div>

          {/* Activity Table */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm min-w-[400px]">
              <thead>
                <tr
                  className={`border-b transition-colors duration-300 ${
                    theme === "dark" ? "border-white/10" : "border-blue-200/30"
                  }`}
                >
                  <th
                    className={`text-left px-3 sm:px-4 py-2 sm:py-3 font-bold uppercase text-[10px] sm:text-xs tracking-wider transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Item Name
                  </th>
                  <th
                    className={`text-left px-3 sm:px-4 py-2 sm:py-3 font-bold uppercase text-[10px] sm:text-xs tracking-wider transition-colors duration-300 hidden sm:table-cell ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Category
                  </th>
                  <th
                    className={`text-left px-3 sm:px-4 py-2 sm:py-3 font-bold uppercase text-[10px] sm:text-xs tracking-wider transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Status
                  </th>
                  <th
                    className={`text-left px-3 sm:px-4 py-2 sm:py-3 font-bold uppercase text-[10px] sm:text-xs tracking-wider transition-colors duration-300 hidden md:table-cell ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Recent Projects */}
                {recentProjects.length > 0 &&
                  recentProjects.slice(0, 5).map((proj) => (
                    <tr
                      key={proj.$id}
                      className={`border-b transition-colors duration-300 ${
                        theme === "dark"
                          ? "border-white/5 hover:bg-white/5"
                          : "border-blue-200/20 hover:bg-white/20"
                      }`}
                    >
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                            <FaFolder className="text-blue-400 text-[10px] sm:text-xs" />
                          </div>
                          <span
                            className={`font-medium transition-colors duration-300 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none ${
                              theme === "dark"
                                ? "text-white/95"
                                : "text-slate-900"
                            }`}
                          >
                            {proj.title}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden sm:table-cell ${
                          theme === "dark"
                            ? "text-slate-200/90"
                            : "text-slate-700"
                        }`}
                      >
                        Project
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                          {proj.featured && (
                            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                              Featured
                            </span>
                          )}
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${
                              proj.status === "published" ||
                              proj.status === "Completed"
                                ? "text-green-400 bg-green-400/10 border-green-400/30"
                                : proj.status === "draft" ||
                                  proj.status === "In Progress"
                                ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
                                : "text-gray-400 bg-gray-400/10 border-gray-400/30"
                            }`}
                          >
                            {proj.status === "published"
                              ? "Completed"
                              : proj.status || "Draft"}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden md:table-cell ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        {formatRelativeTime(proj.$createdAt || proj.$updatedAt)}
                      </td>
                    </tr>
                  ))}

                {/* Recent Messages */}
                {recentMessages.length > 0 &&
                  recentMessages.slice(0, 2).map((msg) => (
                    <tr
                      key={msg.$id}
                      className={`border-b transition-colors duration-300 ${
                        theme === "dark"
                          ? "border-white/5 hover:bg-white/5"
                          : "border-blue-200/20 hover:bg-white/20"
                      }`}
                    >
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                            <FaEnvelope className="text-purple-400 text-[10px] sm:text-xs" />
                          </div>
                          <span
                            className={`font-medium transition-colors duration-300 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none ${
                              theme === "dark" ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {msg.name}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden sm:table-cell ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        Message
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold ${
                            msg.status === "new"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {msg.status === "new" ? "New" : "Read"}
                        </span>
                      </td>
                      <td
                        className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden md:table-cell ${
                          theme === "dark"
                            ? "text-slate-200/90"
                            : "text-slate-600"
                        }`}
                      >
                        {formatRelativeTime(msg.$createdAt)}
                      </td>
                    </tr>
                  ))}

                {recentMessages.length === 0 && recentProjects.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <p
                        className={`transition-colors duration-300 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        No recent activity
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Storage & Views */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6">
          {/* Storage Usage */}
          <div
            className={`glass-card backdrop-blur-xl border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-colors duration-300 ${
              theme === "dark"
                ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
                : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
            }`}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3
                className={`text-sm sm:text-base font-bold transition-colors duration-300 ${
                  theme === "dark" ? "text-white/95" : "text-slate-900"
                }`}
              >
                Storage Usage
              </h3>
            </div>

            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <svg
                  className="transform -rotate-90"
                  width="100"
                  height="100"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={
                      theme === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(59,130,246,0.1)"
                    }
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeDasharray="282.7"
                    strokeDashoffset={
                      282.7 - (282.7 * storageStats.usedPercentage) / 100
                    }
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`text-lg font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {storageStats.usedPercentage}%
                  </span>
                </div>
              </div>
            </div>

            <p
              className={`text-center text-xs sm:text-sm transition-colors duration-300 ${
                theme === "dark" ? "text-slate-200/90" : "text-slate-700"
              }`}
            >
              {storageStats.totalSizeMB < 1024
                ? `${storageStats.totalSizeMB.toFixed(1)} MB`
                : `${(storageStats.totalSizeMB / 1024).toFixed(2)} GB`}{" "}
              of {storageStats.maxStorageMB / 1024} GB used
            </p>
            <p
              className={`text-center text-[10px] sm:text-xs transition-colors duration-300 mb-3 sm:mb-4 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {storageStats.totalFiles} files stored in your bucket
            </p>

            <button
              onClick={() => onNavigateToTab?.("gallery")}
              className={`w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition duration-300 border ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white hover:bg-white/15 hover:border-white/30"
                  : "bg-white/30 border-blue-200/30 text-slate-900 hover:bg-white/40 hover:border-blue-200/40"
              }`}
            >
              Manage Storage
            </button>
          </div>

          {/* Portfolio Stats */}
          <div
            className={`glass-card backdrop-blur-xl border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-colors duration-300 ${
              theme === "dark"
                ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
                : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
            }`}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3
                className={`text-sm sm:text-base font-bold transition-colors duration-300 ${
                  theme === "dark" ? "text-white/95" : "text-slate-900"
                }`}
              >
                Portfolio Stats
              </h3>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Stats bars */}
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-24 sm:h-32">
                {[
                  {
                    label: "Proj",
                    fullLabel: "Projects",
                    value: totalProjects,
                    max: Math.max(
                      totalProjects,
                      filteredSkills.length,
                      totalCertifications,
                      totalGallery,
                      newMessages || 1
                    ),
                    color: "from-blue-500 to-blue-400",
                  },
                  {
                    label: "Skill",
                    fullLabel: "Skills",
                    value: filteredSkills.length,
                    max: Math.max(
                      totalProjects,
                      filteredSkills.length,
                      totalCertifications,
                      totalGallery,
                      newMessages || 1
                    ),
                    color: "from-purple-500 to-purple-400",
                  },
                  {
                    label: "Cert",
                    fullLabel: "Certs",
                    value: totalCertifications,
                    max: Math.max(
                      totalProjects,
                      filteredSkills.length,
                      totalCertifications,
                      totalGallery,
                      newMessages || 1
                    ),
                    color: "from-amber-500 to-amber-400",
                  },
                  {
                    label: "Img",
                    fullLabel: "Gallery",
                    value: totalGallery,
                    max: Math.max(
                      totalProjects,
                      filteredSkills.length,
                      totalCertifications,
                      totalGallery,
                      newMessages || 1
                    ),
                    color: "from-green-500 to-green-400",
                  },
                  {
                    label: "Msg",
                    fullLabel: "Messages",
                    value: newMessages,
                    max: Math.max(
                      totalProjects,
                      filteredSkills.length,
                      totalCertifications,
                      totalGallery,
                      newMessages || 1
                    ),
                    color: "from-cyan-500 to-cyan-400",
                  },
                ].map((bar, idx) => {
                  const heightPercent =
                    bar.max > 0 ? Math.max((bar.value / bar.max) * 100, 5) : 5;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 sm:gap-2"
                    >
                      <div
                        className={`w-full rounded-t-md sm:rounded-t-lg transition-all duration-300 hover:opacity-90 bg-gradient-to-t ${bar.color} relative group`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        <span
                          className={`absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2 text-[10px] sm:text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${
                            theme === "dark" ? "text-cyan-300" : "text-blue-600"
                          }`}
                        >
                          {bar.value}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-semibold transition-colors duration-300 ${
                          theme === "dark"
                            ? "text-slate-100/90"
                            : "text-slate-700"
                        }`}
                      >
                        <span className="sm:hidden">{bar.label}</span>
                        <span className="hidden sm:inline">
                          {bar.fullLabel}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
