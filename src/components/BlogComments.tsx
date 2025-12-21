import React, { useState, useEffect, useRef } from "react";
import {
  FaComment,
  FaPaperPlane,
  FaReply,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
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
 * Displays and manages comments for a blog post in a carousel format.
 * Uses the project's ocean theme with CSS variables for consistent styling.
 * Features:
 * - Carousel display for comments
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyIndex, setReplyIndex] = useState(0); // Track current reply in carousel
  const [isAnimating, setIsAnimating] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
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

  // Get top-level comments and replies
  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (commentId: string) =>
    comments.filter((c) => c.parentId === commentId);

  // Carousel navigation
  const goToNext = () => {
    if (isAnimating || topLevelComments.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % topLevelComments.length);
    setReplyIndex(0); // Reset reply index when changing comments
    setTimeout(() => setIsAnimating(false), 400);
  };

  const goToPrev = () => {
    if (isAnimating || topLevelComments.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex(
      (prev) => (prev - 1 + topLevelComments.length) % topLevelComments.length
    );
    setReplyIndex(0); // Reset reply index when changing comments
    setTimeout(() => setIsAnimating(false), 400);
  };

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setReplyIndex(0); // Reset reply index when changing comments
    setTimeout(() => setIsAnimating(false), 400);
  };

  // Auto-play carousel (optional - every 8 seconds)
  useEffect(() => {
    if (topLevelComments.length <= 1) return;

    autoPlayRef.current = setInterval(() => {
      goToNext();
    }, 8000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [topLevelComments.length, currentIndex]);

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
        isApproved: true,
      });

      // Optimistically add to list
      setComments((prev) => [...prev, newComment]);

      // Reset form
      setForm({ authorName: "", authorEmail: "", content: "" });
      setReplyingTo(null);
      showToast("success", "Your comment has been posted successfully!");

      // Go to the new comment (it will be at the end)
      setTimeout(() => {
        const newTopLevel = [...topLevelComments, newComment].filter(
          (c) => !c.parentId
        );
        setCurrentIndex(newTopLevel.length - 1);
      }, 100);
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

  // Current comment for carousel
  const currentComment = topLevelComments[currentIndex];
  const currentReplies = currentComment ? getReplies(currentComment.$id) : [];

  return (
    <div className="mt-16 mb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20">
            <FaComment className="text-[var(--brand-ocean-2)]" />
          </div>
          <h2 className={`text-2xl font-bold ${textPrimary}`}>
            Comments
            {topLevelComments.length > 0 && (
              <span className={`ml-2 text-lg font-normal ${textAccent}`}>
                ({topLevelComments.length})
              </span>
            )}
          </h2>
        </div>
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

      {/* Comments Carousel */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-3 border-[var(--brand-ocean-2)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={textAccent}>Loading comments...</p>
        </div>
      ) : topLevelComments.length === 0 ? (
        <div
          className={`text-center py-12 rounded-2xl border mb-8 ${cardStyles}`}
        >
          <FaComment className={`text-4xl mx-auto mb-4 ${textAccent}`} />
          <p className={`text-lg font-medium mb-2 ${textPrimary}`}>
            No comments yet
          </p>
          <p className={textAccent}>Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="mb-8">
          {/* Carousel Container */}
          <div className="relative">
            {/* Main Comment Card */}
            <div
              className={`p-6 md:p-8 rounded-2xl border transition-all duration-400 ${cardStyles} ${
                isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
              }`}
            >
              {/* Comment Author */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20 text-[var(--brand-ocean-2)] flex-shrink-0">
                  {currentComment?.authorName?.charAt(0).toUpperCase() || (
                    <FaUser />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-lg ${textPrimary}`}>
                    {currentComment?.authorName}
                  </h4>
                  <p
                    className={`text-sm flex items-center gap-1.5 ${textAccent}`}
                  >
                    <FaClock className="text-xs" />
                    {formatDate(currentComment?.$createdAt)}
                  </p>
                </div>
              </div>

              {/* Comment Content */}
              <blockquote
                className={`text-base md:text-lg leading-relaxed mb-6 ${textSecondary}`}
              >
                "{currentComment?.content}"
              </blockquote>

              {/* Reply Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setReplyingTo(
                    replyingTo === currentComment?.$id
                      ? null
                      : currentComment?.$id || null
                  );
                }}
                className="flex items-center gap-1.5 text-sm font-medium transition-colors text-[var(--brand-ocean-2)] hover:text-[var(--brand-ocean-3)]"
              >
                <FaReply className="text-xs" />
                {replyingTo === currentComment?.$id ? "Cancel" : "Reply"}
              </button>

              {/* Reply Form (inline) */}
              {replyingTo === currentComment?.$id && (
                <form
                  onSubmit={(e) => handleSubmit(e, currentComment.$id)}
                  className={`mt-4 p-4 rounded-xl border ${cardStyles}`}
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
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${inputStyles} focus:outline-none`}
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={form.authorEmail}
                      onChange={(e) =>
                        setForm({ ...form, authorEmail: e.target.value })
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${inputStyles} focus:outline-none`}
                    />
                  </div>
                  <textarea
                    placeholder="Write your reply..."
                    value={form.content}
                    onChange={(e) =>
                      setForm({ ...form, content: e.target.value })
                    }
                    required
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors resize-none mb-3 ${inputStyles} focus:outline-none`}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setReplyingTo(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${textAccent} hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
                    >
                      <FaPaperPlane className="text-xs" />
                      {submitting ? "Posting..." : "Post Reply"}
                    </button>
                  </div>
                </form>
              )}

              {/* Replies Section - Mini Carousel */}
              {currentReplies.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-sm font-medium ${textAccent}`}>
                      {currentReplies.length}{" "}
                      {currentReplies.length === 1 ? "Reply" : "Replies"}
                    </p>
                    {currentReplies.length > 1 && (
                      <span className={`text-xs ${textAccent}`}>
                        {replyIndex + 1} / {currentReplies.length}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    {/* Reply Card */}
                    <div
                      className={`p-4 rounded-xl border ${cardStyles} transition-opacity duration-300`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20 text-[var(--brand-ocean-2)]">
                          {currentReplies[replyIndex]?.authorName
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <h5
                            className={`text-sm font-semibold ${textPrimary}`}
                          >
                            {currentReplies[replyIndex]?.authorName}
                          </h5>
                          <p className={`text-xs ${textAccent}`}>
                            {formatDate(currentReplies[replyIndex]?.$createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm leading-relaxed ${textSecondary}`}>
                        {currentReplies[replyIndex]?.content}
                      </p>
                    </div>

                    {/* Reply Navigation */}
                    {currentReplies.length > 1 && (
                      <div className="flex items-center justify-center gap-3 mt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setReplyIndex(
                              (prev) =>
                                (prev - 1 + currentReplies.length) %
                                currentReplies.length
                            );
                          }}
                          className={`p-1.5 rounded-full border transition-all ${cardStyles} hover:bg-[var(--brand-ocean-2)]/10 hover:border-[var(--brand-ocean-2)]/50`}
                          aria-label="Previous reply"
                        >
                          <FaChevronLeft className={`w-3 h-3 ${textPrimary}`} />
                        </button>

                        {/* Reply Dots */}
                        <div className="flex gap-1.5">
                          {currentReplies.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setReplyIndex(idx);
                              }}
                              className={`w-2 h-2 rounded-full transition-all ${
                                idx === replyIndex
                                  ? "bg-[var(--brand-ocean-2)] scale-110"
                                  : "bg-[var(--glass-border)] hover:bg-[var(--brand-ocean-2)]/50"
                              }`}
                              aria-label={`Go to reply ${idx + 1}`}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setReplyIndex(
                              (prev) => (prev + 1) % currentReplies.length
                            );
                          }}
                          className={`p-1.5 rounded-full border transition-all ${cardStyles} hover:bg-[var(--brand-ocean-2)]/10 hover:border-[var(--brand-ocean-2)]/50`}
                          aria-label="Next reply"
                        >
                          <FaChevronRight
                            className={`w-3 h-3 ${textPrimary}`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            {topLevelComments.length > 1 && (
              <>
                <button
                  onClick={goToPrev}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 md:-translate-x-6 p-2.5 rounded-full border transition-all ${cardStyles} hover:bg-[var(--brand-ocean-2)]/10 hover:border-[var(--brand-ocean-2)]/50`}
                  aria-label="Previous comment"
                >
                  <FaChevronLeft className={`w-4 h-4 ${textPrimary}`} />
                </button>
                <button
                  onClick={goToNext}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 md:translate-x-6 p-2.5 rounded-full border transition-all ${cardStyles} hover:bg-[var(--brand-ocean-2)]/10 hover:border-[var(--brand-ocean-2)]/50`}
                  aria-label="Next comment"
                >
                  <FaChevronRight className={`w-4 h-4 ${textPrimary}`} />
                </button>
              </>
            )}
          </div>

          {/* Dots Navigation */}
          {topLevelComments.length > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              {topLevelComments.length <= 10 ? (
                // Show all dots if 10 or less
                topLevelComments.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`transition-all duration-300 rounded-full ${
                      index === currentIndex
                        ? "w-8 h-3 bg-gradient-to-r from-[var(--brand-ocean-2)] to-[var(--brand-ocean-3)]"
                        : `w-3 h-3 bg-[var(--glass-border)] hover:bg-[var(--brand-ocean-2)]/50`
                    }`}
                    aria-label={`Go to comment ${index + 1}`}
                  />
                ))
              ) : (
                // Show counter if more than 10 comments
                <p className={`text-sm ${textAccent}`}>
                  {currentIndex + 1} of {topLevelComments.length} comments
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* New comment form */}
      <form
        onSubmit={(e) => handleSubmit(e)}
        className={`p-5 md:p-6 rounded-2xl border ${cardStyles}`}
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
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-[var(--brand-ocean-2)] dark:to-[var(--brand-ocean-3)] text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 dark:hover:from-[var(--brand-ocean-3)] dark:hover:to-[var(--brand-ocean-4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <FaPaperPlane />
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogComments;
