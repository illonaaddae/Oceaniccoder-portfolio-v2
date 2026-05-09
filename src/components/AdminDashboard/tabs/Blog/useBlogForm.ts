import React, { useState, useRef } from "react";
import { BlogPost } from "@/types";
import { useBlogActions } from "./useBlogActions";
import { useBlogModal } from "./useBlogModal";
import {
  createTagHandlers,
  createImageInserter,
  filterPosts,
} from "./formHelpers";

export function useBlogForm(
  blogPosts: BlogPost[],
  onAdd: (post: Partial<BlogPost>) => Promise<void>,
  onEdit: (id: string, post: Partial<BlogPost>) => Promise<void>,
  onDelete: (id: string) => Promise<void>,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const modal = useBlogModal();

  const {
    toast,
    handleSubmit: submitAction,
    handleDelete,
  } = useBlogActions({ blogPosts, onAdd, onEdit, onDelete });

  const filteredPosts = filterPosts(blogPosts, searchQuery);

  const handleSubmit = (e: React.FormEvent) =>
    submitAction(
      e,
      modal.formData,
      modal.editingPost,
      modal.closeModal,
      setSubmitting,
    );

  const tagHandlers = createTagHandlers(
    modal.formData,
    modal.setFormData,
    modal.tagInput,
    modal.setTagInput,
  );

  const insertImageToContent = createImageInserter(
    modal.formData,
    modal.setFormData,
    contentTextareaRef,
    modal.setShowContentImageUpload,
  );

  return {
    searchQuery,
    setSearchQuery,
    ...modal,
    submitting,
    contentTextareaRef,
    toast,
    filteredPosts,
    handleSubmit,
    handleDelete,
    insertImageToContent,
    ...tagHandlers,
  };
}
