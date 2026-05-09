import React from "react";
import { FaPlus } from "react-icons/fa";

interface BlogHeaderProps {
  theme: "light" | "dark";
  isReadOnly: boolean;
  onNewPost: () => void;
}

export const BlogHeader: React.FC<BlogHeaderProps> = ({
  theme,
  isReadOnly,
  onNewPost,
}) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <h2
        className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
          theme === "dark" ? "text-white" : "text-slate-900"
        }`}
      >
        Blog Posts
      </h2>
      <p
        className={`text-sm sm:text-base transition-colors duration-300 ${
          theme === "dark" ? "text-slate-300" : "text-slate-600"
        }`}
      >
        Create and manage your blog content
      </p>
    </div>
    {!isReadOnly && (
      <button
        onClick={onNewPost}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm sm:text-base transition duration-200 border shadow-lg ${
          theme === "dark"
            ? "bg-gradient-to-r from-emerald-600 to-oceanic-600 border-emerald-500/50 text-white hover:from-emerald-500 hover:to-oceanic-500 shadow-emerald-500/20"
            : "bg-gradient-to-r from-emerald-500 to-oceanic-500 border-emerald-400/50 text-white hover:from-emerald-600 hover:to-oceanic-600 shadow-emerald-400/30"
        }`}
      >
        <FaPlus /> New Post
      </button>
    )}
  </div>
);
