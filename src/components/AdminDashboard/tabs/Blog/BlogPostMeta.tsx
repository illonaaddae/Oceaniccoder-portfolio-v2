import React from "react";
import { FaCalendarAlt, FaClock, FaTag } from "react-icons/fa";
import { BlogPost } from "@/types";
import { formatDate } from "./utils";

interface BlogPostMetaProps {
  post: BlogPost;
  theme: "light" | "dark";
}

export const BlogPostMeta: React.FC<BlogPostMetaProps> = ({ post, theme }) => (
  <>
    <div
      className={`flex flex-wrap items-center gap-1.5 md:gap-2 text-[10px] md:text-xs transition-colors duration-300 ${
        theme === "dark" ? "text-slate-500" : "text-slate-500"
      }`}
    >
      {post.category && (
        <span
          className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-md font-medium ${
            theme === "dark"
              ? "bg-oceanic-500/20 text-oceanic-500 border border-oceanic-500/30"
              : "bg-oceanic-100 text-oceanic-700 border border-oceanic-200"
          }`}
        >
          {post.category}
        </span>
      )}
      <span className="hidden md:flex items-center gap-1">
        <FaCalendarAlt />
        {formatDate(post.publishedAt)}
      </span>
      {post.readTime && (
        <span className="hidden md:flex items-center gap-1">
          <FaClock />
          {post.readTime}
        </span>
      )}
      {!post.published && (
        <span
          className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-md font-medium ${
            theme === "dark"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-amber-100 text-amber-700 border border-amber-200"
          }`}
        >
          Draft
        </span>
      )}
    </div>
    {post.tags && post.tags.length > 0 && (
      <div className="hidden md:flex flex-wrap gap-1.5 mt-2">
        {post.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className={`px-2 py-0.5 text-xs rounded-md flex items-center gap-1 ${
              theme === "dark"
                ? "bg-white/8 text-slate-400 border border-white/10"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            <FaTag
              className={theme === "dark" ? "text-oceanic-500" : "text-oceanic-600"}
            />
            {tag}
          </span>
        ))}
        {post.tags.length > 3 && (
          <span
            className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}
          >
            +{post.tags.length - 3} more
          </span>
        )}
      </div>
    )}
  </>
);
