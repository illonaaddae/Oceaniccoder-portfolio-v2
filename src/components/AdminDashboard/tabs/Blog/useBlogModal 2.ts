import { useState } from "react";
import { BlogPost } from "@/types";
import { DEFAULT_FORM_DATA } from "./constants";
import { postToFormData } from "./formHelpers";

export function useBlogModal() {
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    ...DEFAULT_FORM_DATA,
  });
  const [tagInput, setTagInput] = useState("");
  const [showContentImageUpload, setShowContentImageUpload] = useState(false);

  const resetForm = () => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      publishedAt: new Date().toISOString().split("T")[0],
    });
    setTagInput("");
    setShowContentImageUpload(false);
  };

  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setFormData(postToFormData(post));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPost(null);
    resetForm();
  };

  const openNewPostModal = () => {
    resetForm();
    setEditingPost(null);
    setShowModal(true);
  };

  return {
    showModal,
    editingPost,
    formData,
    setFormData,
    tagInput,
    setTagInput,
    showContentImageUpload,
    setShowContentImageUpload,
    resetForm,
    openEditModal,
    closeModal,
    openNewPostModal,
  };
}
