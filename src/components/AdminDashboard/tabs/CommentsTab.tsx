import { useState, useEffect } from "react";
import {
  FaComment,
  FaTrash,
  FaCheck,
  FaTimes,
  FaReply,
  FaClock,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import type { Comment, BlogPost } from "@/types";
import {
  getAllComments,
  updateComment,
  deleteComment,
  getBlogPosts,
} from "@/services/api";

interface CommentsTabProps {
  theme: "light" | "dark";
  isReadOnly?: boolean;
}

export const CommentsTab: React.FC<CommentsTabProps> = ({
  theme,
  isReadOnly = false,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Show toast notification
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load comments and blog posts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [commentsData, postsData] = await Promise.all([
          getAllComments(),
          getBlogPosts(),
        ]);
        setComments(commentsData);
        setBlogPosts(postsData);
      } catch (error) {
        console.error("Failed to load comments:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Get post title by ID
  const getPostTitle = (postId: string) => {
    const post = blogPosts.find((p) => p.$id === postId);
    return post?.title || "Unknown Post";
  };

  // Get post slug by ID
  const getPostSlug = (postId: string) => {
    const post = blogPosts.find((p) => p.$id === postId);
    return post?.slug || postId;
  };

  // Filter comments
  const filteredComments = comments.filter((comment) => {
    if (filter === "pending") return comment.isApproved === false;
    if (filter === "approved") return comment.isApproved !== false;
    return true;
  });

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle approve/unapprove
  const handleToggleApproval = async (
    commentId: string,
    currentStatus: boolean | undefined
  ) => {
    if (isReadOnly) return;
    try {
      const newStatus = currentStatus === false ? true : false;
      await updateComment(commentId, { isApproved: newStatus });
      setComments((prev) =>
        prev.map((c) =>
          c.$id === commentId ? { ...c, isApproved: newStatus } : c
        )
      );
      showToast(
        "success",
        newStatus ? "Comment approved successfully!" : "Comment unapproved"
      );
    } catch (error) {
      console.error("Failed to update comment:", error);
      showToast("error", "Failed to update comment. Please try again.");
    }
  };

  // Handle delete
  const handleDelete = async (commentId: string) => {
    if (isReadOnly) return;
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.$id !== commentId));
      setDeleteConfirm(null);
      showToast("success", "Comment deleted successfully!");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      showToast("error", "Failed to delete comment. Please try again.");
    }
  };

  // Theme styles
  const cardStyles =
    theme === "dark"
      ? "glass-card bg-gray-800/50 border-gray-700/80"
      : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40";

  const textPrimary = theme === "dark" ? "text-white" : "text-slate-900";
  const textSecondary =
    theme === "dark" ? "text-slate-200/90" : "text-slate-700/80";
  const textMuted = theme === "dark" ? "text-gray-400" : "text-slate-600";

  // Stats
  const totalComments = comments.length;
  const pendingComments = comments.filter((c) => c.isApproved === false).length;
  const approvedComments = comments.filter(
    (c) => c.isApproved !== false
  ).length;

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

      {/* Header */}
      <div>
        <h1
          className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${textPrimary}`}
        >
          Comments
        </h1>
        <p
          className={`text-sm sm:text-base transition-colors duration-300 ${textSecondary}`}
        >
          {isReadOnly
            ? "Overview of blog comment activity"
            : "Manage blog post comments and moderation"}
        </p>
      </div>

      {/* Read-only notice banner */}
      {isReadOnly && (
        <div
          className={`rounded-xl p-4 border ${
            theme === "dark"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <p className="text-sm font-medium flex items-center gap-2">
            <span className="text-lg">🔒</span>
            Comment moderation is only available to the admin. This is a
            read-only view of comment statistics.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`${cardStyles} border rounded-2xl p-4 transition-colors duration-200`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
              <FaComment className="text-cyan-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>
                {totalComments}
              </p>
              <p className={`text-sm ${textMuted}`}>Total Comments</p>
            </div>
          </div>
        </div>
        <div
          className={`${cardStyles} border rounded-2xl p-4 transition-colors duration-200`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <FaClock className="text-amber-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>
                {pendingComments}
              </p>
              <p className={`text-sm ${textMuted}`}>Pending Review</p>
            </div>
          </div>
        </div>
        <div
          className={`${cardStyles} border rounded-2xl p-4 transition-colors duration-200`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <FaCheck className="text-green-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>
                {approvedComments}
              </p>
              <p className={`text-sm ${textMuted}`}>Approved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
              filter === f
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                : theme === "dark"
                ? "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                : "bg-slate-200/60 text-slate-600 hover:bg-slate-300/60"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "pending" && pendingComments > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">
                {pendingComments}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-12">
          <div
            className={`w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4`}
          />
          <p className={textMuted}>Loading comments...</p>
        </div>
      ) : filteredComments.length === 0 ? (
        <div
          className={`${cardStyles} border rounded-2xl p-12 text-center transition-colors duration-200`}
        >
          <FaComment className={`text-4xl mx-auto mb-4 ${textMuted}`} />
          <p className={textMuted}>
            {filter === "pending"
              ? "No pending comments"
              : filter === "approved"
              ? "No approved comments"
              : "No comments yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <div
              key={comment.$id}
              className={`${cardStyles} border rounded-2xl p-4 md:p-5 transition-all duration-200`}
            >
              {/* Comment Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-500 ${
                      isReadOnly ? "blur-sm" : ""
                    }`}
                  >
                    {isReadOnly
                      ? "•"
                      : comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4
                      className={`font-semibold ${textPrimary} ${
                        isReadOnly ? "blur-sm select-none" : ""
                      }`}
                    >
                      {isReadOnly ? "••••••••" : comment.authorName}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {comment.authorEmail && (
                        <span
                          className={`text-xs ${textMuted} ${
                            isReadOnly ? "blur-sm select-none" : ""
                          }`}
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
                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    comment.isApproved === false
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
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
                className={`mb-3 p-2 rounded-lg ${
                  theme === "dark" ? "bg-gray-900/50" : "bg-slate-100/50"
                }`}
              >
                <Link
                  to={`/blog/${getPostSlug(comment.postId)}`}
                  target="_blank"
                  className="flex items-center gap-2 text-sm text-cyan-500 hover:text-cyan-400 transition-colors"
                >
                  <FaExternalLinkAlt className="text-xs" />
                  <span className="line-clamp-1">
                    {getPostTitle(comment.postId)}
                  </span>
                </Link>
              </div>

              {/* Reply indicator */}
              {comment.parentId && (
                <div
                  className={`mb-2 flex items-center gap-1.5 text-xs ${textMuted}`}
                >
                  <FaReply className="text-[10px]" />
                  Reply to another comment
                </div>
              )}

              {/* Comment Content */}
              <p
                className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap ${textSecondary} ${
                  isReadOnly ? "blur-sm select-none" : ""
                }`}
              >
                {isReadOnly
                  ? "Comment content is protected and only visible to admin..."
                  : comment.content}
              </p>

              {/* Actions */}
              {!isReadOnly && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/30">
                  <button
                    onClick={() =>
                      handleToggleApproval(comment.$id, comment.isApproved)
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      comment.isApproved === false
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    }`}
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
                        onClick={() => handleDelete(comment.$id)}
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-all"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          theme === "dark"
                            ? "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                            : "bg-slate-200/60 text-slate-600 hover:bg-slate-300/60"
                        }`}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsTab;
