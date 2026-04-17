import React from "react";
import { BlogPost } from "@/types";
import { useToast } from "../../Toast";
import { generateSlug } from "./utils";

interface UseBlogActionsProps {
  blogPosts: BlogPost[];
  onAdd: (post: Partial<BlogPost>) => Promise<void>;
  onEdit: (id: string, post: Partial<BlogPost>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function useBlogActions({
  blogPosts,
  onAdd,
  onEdit,
  onDelete,
}: UseBlogActionsProps) {
  const toast = useToast();

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
    try {
      if (editingPost) {
        await onEdit(editingPost.$id, { ...formData, slug });
        toast.success(`Blog post "${formData.title}" updated successfully!`);
      } else {
        await onAdd({ ...formData, slug });
        toast.success(`Blog post "${formData.title}" created successfully!`);
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

  const handleDelete = async (id: string) => {
    const p = blogPosts.find((post) => post.$id === id);
    if (!window.confirm("Are you sure you want to delete this blog post?"))
      return;
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
