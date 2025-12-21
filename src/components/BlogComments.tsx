import React, { useState, useEffect } from "react";
import {
  FaComment,
  FaPaperPlane,
  FaReply,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimes,
} from "react-icons/fa";
import { getCommentsByPostId, createComment } from "../services/api";
import type { Comment } from "../types";

interface BlogCommentsProps {
  postId: string;
  isDark?: boolean;
}

/**
 * BlogComments Component
 *
 * Displays and manages comments for a blog post.
 * Uses the project's ocean theme with CSS variables for consistent styling.
 * Features:
 * - Load existing comments
 * - Submit new comments
 * - Reply to comments (threaded)
 * - Real-time optimistic updates
 */
const BlogComments: React.FC<BlogCommentsProps> = ({
  postId,
  isDark = true,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form state
  const [form, setForm] = useState({
    authorName: "",
    authorEmail: "",
    content: "",
  });

  // Show toast notification
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        setLoading(true);
        const data = await getCommentsByPostId(postId);
        setComments(data);
      } catch (error) {
        console.error("Failed to load comments:", error);
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      loadComments();
    }
  }, [postId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();

    if (!form.authorName.trim() || !form.content.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const newComment = await createComment({
        postId,
        authorName: form.authorName.trim(),
        authorEmail: form.authorEmail.trim() || undefined,
        content: form.content.trim(),
        parentId: parentId || undefined,
        isApproved: true, // Auto-approve new comments
      });

      // Optimistically add to list
      setComments((prev) => [...prev, newComment]);

      // Reset form
      setForm({ authorName: "", authorEmail: "", content: "" });
      setReplyingTo(null);
      showToast("success", "Your comment has been posted successfully!");
    } catch (error) {
      console.error("Failed to submit comment:", error);
      showToast("error", "Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
      }
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Get top-level comments and replies
  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (commentId: string) =>
    comments.filter((c) => c.parentId === commentId);

  // Theme-aware styles using CSS variables
  const cardStyles = isDark
    ? "glass-card bg-[var(--glass-bg)] border-[var(--glass-border)]"
    : "bg-[var(--bg-secondary)] border-[var(--glass-border)] shadow-sm";

  const textPrimary = "text-[var(--text-primary)]";
  const textSecondary = "text-[var(--text-secondary)]";
  const textAccent = "text-[var(--text-accent)]";

  const inputStyles = isDark
    ? "bg-[var(--bg-primary)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-[var(--brand-ocean-2)]"
    : "bg-[var(--bg-primary)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-[var(--brand-ocean-2)]";

  // Comment card component
  const CommentCard: React.FC<{ comment: Comment; isReply?: boolean }> = ({
    comment,
    isReply = false,
  }) => {
    const replies = getReplies(comment.$id);

    return (
      <div className={`${isReply ? "ml-8 md:ml-12" : ""}`}>
        <div
          className={`p-4 md:p-5 rounded-xl border transition-all duration-300 hover:border-[var(--brand-ocean-2)]/30 ${cardStyles}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold 
                bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20 
                text-[var(--brand-ocean-2)]"
              >
                {comment.authorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className={`font-semibold ${textPrimary}`}>
                  {comment.authorName}
                </h4>
                <p className={`text-xs flex items-center gap-1 ${textAccent}`}>
                  <FaClock className="text-[10px]" />
                  {formatDate(comment.$createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <p
            className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap ${textSecondary}`}
          >
            {comment.content}
          </p>

          {/* Reply button */}
          {!isReply && (
            <button
              onClick={() =>
                setReplyingTo(replyingTo === comment.$id ? null : comment.$id)
              }
              className="mt-3 flex items-center gap-1.5 text-sm font-medium transition-colors 
                text-[var(--brand-ocean-2)] hover:text-[var(--brand-ocean-3)]"
            >
              <FaReply className="text-xs" />
              Reply
            </button>
          )}

          {/* Reply form */}
          {replyingTo === comment.$id && (
            <form
              onSubmit={(e) => handleSubmit(e, comment.$id)}
              className={`mt-4 p-4 rounded-lg border ${
                isDark
                  ? "bg-[var(--bg-primary)]/50 border-[var(--glass-border)]"
                  : "bg-[var(--bg-tertiary)] border-[var(--glass-border)]"
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Your name *"
                  value={form.authorName}
                  onChange={(e) =>
                    setForm({ ...form, authorName: e.target.value })
                  }
                  required
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${inputStyles} focus:outline-none focus:ring-2 focus:ring-[var(--brand-ocean-2)]/20`}
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={form.authorEmail}
                  onChange={(e) =>
                    setForm({ ...form, authorEmail: e.target.value })
                  }
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${inputStyles} focus:outline-none focus:ring-2 focus:ring-[var(--brand-ocean-2)]/20`}
                />
              </div>
              <textarea
                placeholder="Write your reply..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
                rows={2}
                className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors resize-none ${inputStyles} focus:outline-none focus:ring-2 focus:ring-[var(--brand-ocean-2)]/20`}
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${textAccent} hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-[var(--brand-ocean-2)] to-[var(--brand-ocean-3)] text-white text-sm font-medium rounded-lg hover:from-[var(--brand-ocean-3)] hover:to-[var(--brand-ocean-4)] transition-all disabled:opacity-50"
                >
                  <FaPaperPlane className="text-xs" />
                  {submitting ? "Posting..." : "Post Reply"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => (
              <CommentCard key={reply.$id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20">
          <FaComment className="text-[var(--brand-ocean-2)]" />
        </div>
        <h2 className={`text-2xl font-bold ${textPrimary}`}>
          Comments
          {comments.length > 0 && (
            <span className={`ml-2 text-lg font-normal ${textAccent}`}>
              ({comments.length})
            </span>
          )}
        </h2>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-pulse ${
            toast.type === "success"
              ? "bg-[var(--brand-ocean-2)]/20 border-[var(--brand-ocean-2)]/50 text-[var(--brand-ocean-2)]"
              : "bg-red-500/20 border-red-400/50 text-red-400"
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

      {/* New comment form */}
      <form
        onSubmit={(e) => handleSubmit(e)}
        className={`p-5 md:p-6 rounded-2xl border mb-8 ${cardStyles}`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${textPrimary}`}>
          Leave a Comment
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
            >
              Name <span className="text-[var(--brand-ocean-2)]">*</span>
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={form.authorName}
              onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              required
              className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${inputStyles} focus:outline-none focus:ring-2 focus:ring-[var(--brand-ocean-2)]/20`}
            />
          </div>
          <div>
            <label
              className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
            >
              Email <span className={textAccent}>(optional)</span>
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={form.authorEmail}
              onChange={(e) =>
                setForm({ ...form, authorEmail: e.target.value })
              }
              className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${inputStyles} focus:outline-none focus:ring-2 focus:ring-[var(--brand-ocean-2)]/20`}
            />
          </div>
        </div>
        <div className="mb-4">
          <label
            className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
          >
            Comment <span className="text-[var(--brand-ocean-2)]">*</span>
          </label>
          <textarea
            placeholder="Share your thoughts..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
            rows={4}
            className={`w-full px-4 py-3 rounded-xl border transition-colors resize-none ${inputStyles} focus:outline-none focus:ring-2 focus:ring-[var(--brand-ocean-2)]/20`}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              submitting || !form.authorName.trim() || !form.content.trim()
            }
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[var(--brand-ocean-2)] to-[var(--brand-ocean-3)] text-white font-semibold rounded-xl hover:from-[var(--brand-ocean-3)] hover:to-[var(--brand-ocean-4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--shadow-ocean)]"
          >
            <FaPaperPlane />
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-3 border-[var(--brand-ocean-2)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={textAccent}>Loading comments...</p>
        </div>
      ) : topLevelComments.length === 0 ? (
        <div className={`text-center py-12 rounded-2xl border ${cardStyles}`}>
          <FaComment className={`text-4xl mx-auto mb-4 ${textAccent}`} />
          <p className={`text-lg font-medium mb-2 ${textPrimary}`}>
            No comments yet
          </p>
          <p className={textAccent}>Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map((comment) => (
            <CommentCard key={comment.$id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogComments;
