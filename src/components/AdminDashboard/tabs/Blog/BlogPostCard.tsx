import React from "react";
import { FaStar } from "react-icons/fa";
import { BlogPost } from "@/types";
import { BlogPostActions } from "./BlogPostActions";
import { BlogPostMeta } from "./BlogPostMeta";

interface BlogPostCardProps {
  post: BlogPost;
  theme: "light" | "dark";
  isReadOnly: boolean;
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
}

const FALLBACK_IMAGE =
  "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cef000da2150f34/view?project=6943431e00253c8f9883";

export const BlogPostCard: React.FC<BlogPostCardProps> = ({
  post,
  theme,
  isReadOnly,
  onEdit,
  onDelete,
}) => (
  <div
    className={`glass-card border rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600 hover:bg-gray-800/70"
        : "bg-gradient-to-br from-white/60 to-white/40 border-blue-200/40 hover:border-blue-300/60 hover:bg-gradient-to-br hover:from-white/70 hover:to-white/50"
    }`}
  >
    <div className="flex flex-row gap-3 md:gap-4">
      {post.image && (
        <div
          className={`w-16 h-16 md:w-28 md:h-28 lg:w-24 lg:h-24 flex-shrink-0 rounded-xl overflow-hidden border ${
            theme === "dark" ? "border-gray-700" : "border-blue-200/30"
          }`}
        >
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex flex-row items-start justify-between gap-2 mb-1 md:mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              {post.featured && (
                <FaStar className="text-yellow-400 text-sm flex-shrink-0 mt-0.5" />
              )}
              <h3
                className={`font-semibold text-sm md:text-base lg:text-lg line-clamp-2 md:line-clamp-1 transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                {post.title}
              </h3>
            </div>
          </div>
          <BlogPostActions
            post={post}
            theme={theme}
            isReadOnly={isReadOnly}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
        <p
          className={`hidden md:block text-xs md:text-sm line-clamp-2 mb-2 transition-colors duration-300 ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}
        >
          {post.excerpt}
        </p>
        <BlogPostMeta post={post} theme={theme} />
      </div>
    </div>
  </div>
);
