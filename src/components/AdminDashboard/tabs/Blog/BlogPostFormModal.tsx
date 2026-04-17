import React from "react";
import { BlogPost } from "@/types";
import { Modal } from "../../modals/Modal";
import { BlogFormFields } from "./BlogFormFields";
import { BlogContentEditor } from "./BlogContentEditor";
import { BlogTagsInput } from "./BlogTagsInput";
import { BlogFormSettings } from "./BlogFormSettings";
import { BlogFormActions } from "./BlogFormActions";

interface BlogPostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  editingPost: BlogPost | null;
  formData: Partial<BlogPost>;
  setFormData: (data: Partial<BlogPost>) => void;
  tagInput: string;
  setTagInput: (value: string) => void;
  showContentImageUpload: boolean;
  setShowContentImageUpload: (show: boolean) => void;
  submitting: boolean;
  contentTextareaRef: React.RefObject<HTMLTextAreaElement>;
  onSubmit: (e: React.FormEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  insertImageToContent: (url: string) => void;
}

export const BlogPostFormModal: React.FC<BlogPostFormModalProps> = ({
  isOpen,
  onClose,
  theme,
  editingPost,
  formData,
  setFormData,
  tagInput,
  setTagInput,
  showContentImageUpload,
  setShowContentImageUpload,
  submitting,
  contentTextareaRef,
  onSubmit,
  onAddTag,
  onRemoveTag,
  insertImageToContent,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={editingPost ? "Edit Blog Post" : "Create New Blog Post"}
    theme={theme}
    size="lg"
  >
    <form onSubmit={onSubmit} className="space-y-5">
      <BlogFormFields
        formData={formData}
        setFormData={setFormData}
        theme={theme}
      />
      <BlogContentEditor
        formData={formData}
        setFormData={setFormData}
        theme={theme}
        showContentImageUpload={showContentImageUpload}
        setShowContentImageUpload={setShowContentImageUpload}
        insertImageToContent={insertImageToContent}
        contentTextareaRef={contentTextareaRef}
      />
      <BlogTagsInput
        tags={formData.tags || []}
        tagInput={tagInput}
        setTagInput={setTagInput}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        theme={theme}
      />
      <BlogFormSettings
        formData={formData}
        setFormData={setFormData}
        theme={theme}
      />
      <BlogFormActions
        theme={theme}
        submitting={submitting}
        isEditing={!!editingPost}
        onCancel={onClose}
      />
    </form>
  </Modal>
);
