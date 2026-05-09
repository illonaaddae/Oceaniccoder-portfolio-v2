import React from "react";
import { ToastContainer } from "../Toast";
import { BlogTabProps } from "./Blog/types";
import { useBlogForm } from "./Blog/useBlogForm";
import { BlogHeader } from "./Blog/BlogHeader";
import { BlogSearch } from "./Blog/BlogSearch";
import { BlogPostList } from "./Blog/BlogPostList";
import { BlogPostFormModal } from "./Blog/BlogPostFormModal";

const BlogTab: React.FC<BlogTabProps> = ({
  blogPosts,
  onAdd,
  onEdit,
  onDelete,
  loading,
  theme = "dark",
  isReadOnly = false,
}) => {
  const blog = useBlogForm(blogPosts, onAdd, onEdit, onDelete);

  return (
    <div className="space-y-6">
      <BlogHeader
        theme={theme}
        isReadOnly={isReadOnly}
        onNewPost={blog.openNewPostModal}
      />
      <BlogSearch
        theme={theme}
        searchQuery={blog.searchQuery}
        onSearchChange={blog.setSearchQuery}
      />
      <BlogPostList
        posts={blog.filteredPosts}
        loading={loading}
        theme={theme}
        isReadOnly={isReadOnly}
        onNewPost={blog.openNewPostModal}
        onEdit={blog.openEditModal}
        onDelete={blog.handleDelete}
      />
      <BlogPostFormModal
        isOpen={blog.showModal}
        onClose={blog.closeModal}
        theme={theme}
        editingPost={blog.editingPost}
        formData={blog.formData}
        setFormData={blog.setFormData}
        tagInput={blog.tagInput}
        setTagInput={blog.setTagInput}
        showContentImageUpload={blog.showContentImageUpload}
        setShowContentImageUpload={blog.setShowContentImageUpload}
        submitting={blog.submitting}
        contentTextareaRef={blog.contentTextareaRef}
        onSubmit={blog.handleSubmit}
        onAddTag={blog.handleAddTag}
        onRemoveTag={blog.handleRemoveTag}
        insertImageToContent={blog.insertImageToContent}
      />
      <ToastContainer
        toasts={blog.toast.toasts}
        onRemove={blog.toast.removeToast}
        theme={theme}
      />
    </div>
  );
};

export default BlogTab;
