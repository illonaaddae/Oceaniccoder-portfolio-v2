import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { getCommentsByPostId, createComment } from "../../services/api";
import type { Comment } from "../../types";
import type { CommentFormState, ToastState } from "./types";

export const useComments = (postId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [form, setForm] = useState<CommentFormState>({
    authorName: "",
    authorEmail: "",
    content: "",
  });

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getCommentsByPostId(postId);
        setComments(data);
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        setLoading(false);
      }
    };
    if (postId) load();
  }, [postId]);

  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (id: string) => comments.filter((c) => c.parentId === id);

  const handleSubmit = async (
    e: FormEvent,
    parentId?: string,
    onSuccess?: (c: Comment) => void,
  ) => {
    e.preventDefault();
    if (!form.authorName.trim() || !form.content.trim()) return;
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
      setComments((prev) => [...prev, newComment]);
      setForm({ authorName: "", authorEmail: "", content: "" });
      setReplyingTo(null);
      showToast("success", "Your comment has been posted successfully!");
      onSuccess?.(newComment);
    } catch (err) {
      console.error("Failed to submit comment:", err);
      showToast("error", "Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    loading,
    submitting,
    replyingTo,
    setReplyingTo,
    toast,
    setToast,
    form,
    setForm,
    topLevelComments,
    getReplies,
    handleSubmit,
  };
};
