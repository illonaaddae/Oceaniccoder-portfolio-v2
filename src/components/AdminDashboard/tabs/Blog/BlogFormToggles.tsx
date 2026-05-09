import React from "react";
import { FaStar, FaRegStar } from "react-icons/fa";
import { BlogPost } from "@/types";

interface BlogFormTogglesProps {
  formData: Partial<BlogPost>;
  setFormData: (data: Partial<BlogPost>) => void;
  theme: "light" | "dark";
}

export const BlogFormToggles: React.FC<BlogFormTogglesProps> = ({
  formData,
  setFormData,
  theme,
}) => (
  <div
    className={`flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 p-4 rounded-xl border ${
      theme === "dark"
        ? "bg-white/5 border-white/10"
        : "bg-slate-50 border-blue-200/30"
    }`}
  >
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={formData.featured}
        onChange={(e) =>
          setFormData({ ...formData, featured: e.target.checked })
        }
        className="w-5 h-5 rounded text-yellow-500 focus:ring-yellow-400/50 focus:ring-offset-0"
      />
      <span
        className={`flex items-center gap-2 transition-colors ${
          theme === "dark"
            ? "text-slate-300 group-hover:text-white"
            : "text-slate-600 group-hover:text-slate-900"
        }`}
      >
        {formData.featured ? (
          <FaStar className="text-yellow-500" />
        ) : (
          <FaRegStar
            className={theme === "dark" ? "text-slate-500" : "text-slate-400"}
          />
        )}
        Featured Post
      </span>
    </label>

    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={formData.published}
        onChange={(e) =>
          setFormData({ ...formData, published: e.target.checked })
        }
        className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-400/50 focus:ring-offset-0"
      />
      <span
        className={`transition-colors ${
          theme === "dark"
            ? "text-slate-300 group-hover:text-white"
            : "text-slate-600 group-hover:text-slate-900"
        }`}
      >
        {formData.published ? "✓ Published" : "Draft"}
      </span>
    </label>
  </div>
);
