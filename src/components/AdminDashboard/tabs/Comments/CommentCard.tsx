import {
  FaCheck,
  FaTimes,
  FaReply,
  FaClock,
  FaExternalLinkAlt,
  FaTrash,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import type { Comment } from "@/types";

interface CommentCardProps {
  comment: Comment;
  theme: "light" | "dark";
  isReadOnly: boolean;
  cardStyles: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  getPostTitle: (postId: string) => string;
  getPostSlug: (postId: string) => string;
  formatDate: (dateStr?: string) => string;
  onToggleApproval: (id: string, status: boolean | undefined) => void;
  onDelete: (id: string) => void;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  theme,
  isReadOnly,
  cardStyles,
  textPrimary,
  textSecondary,
  textMuted,
  deleteConfirm,
  setDeleteConfirm,
  getPostTitle,
  getPostSlug,
  formatDate,
  onToggleApproval,
  onDelete,
}) => (
  <div
    className={`${cardStyles} border rounded-2xl p-4 md:p-5 transition-all duration-200`}
  >
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-oceanic-500/20 to-oceanic-900/20 text-oceanic-500 ${isReadOnly ? "blur-sm" : ""}`}
        >
          {isReadOnly ? "•" : comment.authorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4
            className={`font-semibold ${textPrimary} ${isReadOnly ? "blur-sm select-none" : ""}`}
          >
            {isReadOnly ? "••••••••" : comment.authorName}
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            {comment.authorEmail && (
              <span
                className={`text-xs ${textMuted} ${isReadOnly ? "blur-sm select-none" : ""}`}
              >
                {isReadOnly ? "••••••@••••.•••" : comment.authorEmail}
              </span>
            )}
            <span className={`text-xs ${textMuted}`}>
              • {formatDate(comment.$createdAt)}
            </span>
          </div>
        </div>
      </div>
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${comment.isApproved === false ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}
      >
        {comment.isApproved === false ? (
          <>
            <FaClock className="text-[10px]" /> Pending
          </>
        ) : (
          <>
            <FaCheck className="text-[10px]" /> Approved
          </>
        )}
      </span>
    </div>

    {/* Post Reference */}
    <div
      className={`mb-3 p-2 rounded-lg ${theme === "dark" ? "bg-gray-900/50" : "bg-slate-100/50"}`}
    >
      <Link
        to={`/blog/${getPostSlug(comment.postId)}`}
        target="_blank"
        className="flex items-center gap-2 text-sm text-oceanic-500 hover:text-oceanic-500 transition-colors"
      >
        <FaExternalLinkAlt className="text-xs" />
        <span className="line-clamp-1">{getPostTitle(comment.postId)}</span>
      </Link>
    </div>

    {comment.parentId && (
      <div className={`mb-2 flex items-center gap-1.5 text-xs ${textMuted}`}>
        <FaReply className="text-[10px]" /> Reply to another comment
      </div>
    )}

    <p
      className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap ${textSecondary} ${isReadOnly ? "blur-sm select-none" : ""}`}
    >
      {isReadOnly
        ? "Comment content is protected and only visible to admin..."
        : comment.content}
    </p>

    {!isReadOnly && (
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/30">
        <button
          onClick={() => onToggleApproval(comment.$id, comment.isApproved)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${comment.isApproved === false ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"}`}
        >
          {comment.isApproved === false ? (
            <>
              <FaCheck className="text-xs" /> Approve
            </>
          ) : (
            <>
              <FaTimes className="text-xs" /> Unapprove
            </>
          )}
        </button>
        {deleteConfirm === comment.$id ? (
          <div className="flex items-center gap-2">
            <span className={`text-sm ${textMuted}`}>Delete?</span>
            <button
              onClick={() => onDelete(comment.$id)}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-all"
            >
              Yes
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${theme === "dark" ? "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50" : "bg-slate-200/60 text-slate-600 hover:bg-slate-300/60"}`}
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(comment.$id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-all"
          >
            <FaTrash className="text-xs" /> Delete
          </button>
        )}
      </div>
    )}
  </div>
);
