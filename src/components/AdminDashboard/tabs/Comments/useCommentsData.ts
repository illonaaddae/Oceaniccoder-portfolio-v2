import { useState, useEffect, useCallback } from "react";
import type { Comment, BlogPost } from "@/types";
import {
  getAllComments,
  updateComment,
  deleteComment,
  getBlogPosts,
} from "@/services/api";

export function useCommentsData(isReadOnly: boolean) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

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

  const getPostTitle = useCallback(
    (postId: string) =>
      blogPosts.find((p) => p.$id === postId)?.title || "Unknown Post",
    [blogPosts],
  );

  const getPostSlug = useCallback(
    (postId: string) => blogPosts.find((p) => p.$id === postId)?.slug || postId,
    [blogPosts],
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleToggleApproval = async (
    commentId: string,
    currentStatus: boolean | undefined,
  ) => {
    if (isReadOnly) return;
    try {
      const newStatus = currentStatus === false ? true : false;
      await updateComment(commentId, { isApproved: newStatus });
      setComments((prev) =>
        prev.map((c) =>
          c.$id === commentId ? { ...c, isApproved: newStatus } : c,
        ),
      );
      showToast(
        "success",
        newStatus ? "Comment approved successfully!" : "Comment unapproved",
      );
    } catch {
      showToast("error", "Failed to update comment. Please try again.");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (isReadOnly) return;
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.$id !== commentId));
      setDeleteConfirm(null);
      showToast("success", "Comment deleted successfully!");
    } catch {
      showToast("error", "Failed to delete comment. Please try again.");
    }
  };

  const filteredComments = comments.filter((comment) => {
    if (filter === "pending") return comment.isApproved === false;
    if (filter === "approved") return comment.isApproved !== false;
    return true;
  });

  const totalComments = comments.length;
  const pendingComments = comments.filter((c) => c.isApproved === false).length;
  const approvedComments = comments.filter(
    (c) => c.isApproved !== false,
  ).length;

  return {
    loading,
    filter,
    setFilter,
    deleteConfirm,
    setDeleteConfirm,
    toast,
    setToast,
    filteredComments,
    totalComments,
    pendingComments,
    approvedComments,
    getPostTitle,
    getPostSlug,
    formatDate,
    handleToggleApproval,
    handleDelete,
  };
}
