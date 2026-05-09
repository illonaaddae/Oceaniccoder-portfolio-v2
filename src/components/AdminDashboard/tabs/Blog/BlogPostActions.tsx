import React from "react";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { BlogPost } from "@/types";

interface BlogPostActionsProps {
  post: BlogPost;
  theme: "light" | "dark";
  isReadOnly: boolean;
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
}

export const BlogPostActions: React.FC<BlogPostActionsProps> = ({
  post,
  theme,
  isReadOnly,
  onEdit,
  onDelete,
}) => (
  <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
    <a
      href={`/blog/${post.slug || post.$id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`p-1.5 md:p-2 rounded-lg transition-all duration-200 ${
        theme === "dark"
          ? "text-slate-400 hover:text-oceanic-500 hover:bg-oceanic-500/15"
          : "text-slate-500 hover:text-oceanic-600 hover:bg-oceanic-100"
      }`}
      title="View"
    >
      <FaEye className="text-xs md:text-sm" />
    </a>
    {!isReadOnly && (
      <>
        <button
          onClick={() => onEdit(post)}
          className={`p-1.5 md:p-2 rounded-lg transition-all duration-200 ${
            theme === "dark"
              ? "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/15"
              : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-100"
          }`}
          title="Edit"
        >
          <FaEdit className="text-xs md:text-sm" />
        </button>
        <button
          onClick={() => onDelete(post.$id)}
          className={`p-1.5 md:p-2 rounded-lg transition-all duration-200 ${
            theme === "dark"
              ? "text-slate-400 hover:text-red-400 hover:bg-red-500/15"
              : "text-slate-500 hover:text-red-600 hover:bg-red-100"
          }`}
          title="Delete"
        >
          <FaTrash className="text-xs md:text-sm" />
        </button>
      </>
    )}
  </div>
);
