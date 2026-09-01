import React from "react";
import { BlogPost } from "@/types";
import { useToast } from "../../Toast";
import { useConfirm } from "../../ConfirmContext";
import { generateSlug } from "./utils";
import { shouldSendNewsletter } from "./newsletterTrigger";
import { apiUrl } from "@/utils/apiUrl";

interface UseBlogActionsProps {
  blogPosts: BlogPost[];
  onAdd: (post: Partial<BlogPost>) => Promise<void>;
  onEdit: (id: string, post: Partial<BlogPost>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function useBlogActions({ blogPosts, onAdd, onEdit, onDelete }: UseBlogActionsProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const handleSubmit = async (
    e: React.FormEvent,
    formData: Partial<BlogPost>,
    editingPost: BlogPost | null,
    onSuccess: () => void,
    setSubmitting: (v: boolean) => void,
  ) => {
    e.preventDefault();
    setSubmitting(true);
    const slug = formData.slug || generateSlug(formData.title);
    // Decided before the write, while editingPost still holds the pre-save
    // published state.
    const sendNewsletter = shouldSendNewsletter(editingPost, formData);
    try {
      if (editingPost) {
        await onEdit(editingPost.$id, { ...formData, slug });
        toast.success(`Blog post "${formData.title}" updated successfully!`);
      } else {
        await onAdd({ ...formData, slug });
        toast.success(`Blog post "${formData.title}" created successfully!`);
      }

      if (sendNewsletter) {
        // Not awaited: the post is already saved and a slow broadcast should
        // not hold the modal open. The result is still surfaced — this used to
        // be console.warn only, so a failed send looked exactly like a
        // successful one.
        void broadcastNewPost({ ...formData, slug });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast.error(
        editingPost
          ? "Failed to update blog post. Please try again."
          : "Failed to create blog post. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** Fires the Resend broadcast and reports the outcome. */
  const broadcastNewPost = async (post: Partial<BlogPost> & { slug: string }) => {
    try {
      const res = await fetch(apiUrl("/api/send-newsletter"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: post.title,
          excerpt: post.excerpt,
          slug: post.slug,
          category: post.category,
          image: post.image,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.error || `Newsletter API returned ${res.status}`);
      }
      toast.success("Newsletter sent to your subscribers.");
    } catch (err) {
      console.error("Newsletter send failed:", err);
      toast.error(
        "Post saved, but the newsletter did not go out. Check RESEND_API_KEY and RESEND_AUDIENCE_ID.",
      );
    }
  };

  const handleDelete = async (id: string) => {
    const p = blogPosts.find((post) => post.$id === id);
    const ok = await confirm({
      message: "Delete blog post?",
      description: "This will permanently remove the post.",
    });
    if (!ok) return;
    try {
      await onDelete(id);
      toast.success(`Blog post "${p?.title}" deleted successfully!`);
    } catch (error) {
      console.error("Error deleting blog post:", error);
      toast.error("Failed to delete blog post. Please try again.");
    }
  };

  return { toast, handleSubmit, handleDelete };
}
