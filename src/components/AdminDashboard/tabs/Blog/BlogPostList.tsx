import React from "react";
import { FaEdit, FaPlus } from "react-icons/fa";
import { BlogPost } from "@/types";
import { BlogPostCard } from "./BlogPostCard";

interface BlogPostListProps {
  posts: BlogPost[];
  loading?: boolean;
  theme: "light" | "dark";
  isReadOnly: boolean;
  onNewPost: () => void;
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
}

export const BlogPostList: React.FC<BlogPostListProps> = ({
  posts,
  loading,
  theme,
  isReadOnly,
  onNewPost,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div
          className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${
            theme === "dark" ? "border-oceanic-500" : "border-oceanic-500"
          }`}
        />
        <p
          className={`transition-colors duration-300 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
        >
          Loading posts...
        </p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <FaEdit
          className={`text-5xl mx-auto mb-4 transition-colors duration-300 ${theme === "dark" ? "text-gray-600" : "text-slate-400"}`}
        />
        <h3
          className={`text-xl font-medium mb-2 transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
        >
          No posts yet
        </h3>
        <p
          className={`mb-6 transition-colors duration-300 ${theme === "dark" ? "text-gray-400" : "text-slate-600"}`}
        >
          Create your first blog post to get started
        </p>
        {!isReadOnly && (
          <button
            onClick={onNewPost}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 inline-flex items-center gap-2 shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-oceanic-600 to-oceanic-800 text-white hover:from-oceanic-500 hover:to-oceanic-700 shadow-oceanic-500/20"
                : "bg-gradient-to-r from-oceanic-500 to-oceanic-700 text-white hover:from-oceanic-600 hover:to-oceanic-800 shadow-oceanic-400/30"
            }`}
          >
            <FaPlus /> Create Post
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <BlogPostCard
          key={post.$id}
          post={post}
          theme={theme}
          isReadOnly={isReadOnly}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
