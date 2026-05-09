import React from "react";
import { BlogPost } from "@/types";

export function filterPosts(posts: BlogPost[], query: string): BlogPost[] {
  const q = query.toLowerCase();
  return posts.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q),
  );
}

export function postToFormData(post: BlogPost): Partial<BlogPost> {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category || "",
    tags: post.tags || [],
    publishedAt: post.publishedAt || "",
    readTime: post.readTime || "",
    image: post.image || "",
    featured: post.featured || false,
    published: post.published !== false,
  };
}

export function createTagHandlers(
  formData: Partial<BlogPost>,
  setFormData: (data: Partial<BlogPost>) => void,
  tagInput: string,
  setTagInput: (v: string) => void,
) {
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  return { handleAddTag, handleRemoveTag };
}

export function createImageInserter(
  formData: Partial<BlogPost>,
  setFormData: (data: Partial<BlogPost>) => void,
  contentTextareaRef: React.RefObject<HTMLTextAreaElement | null>,
  setShowContentImageUpload: (v: boolean) => void,
) {
  return (imageUrl: string) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const imgMd = `\n![Image](${imageUrl})\n`;
    const content = formData.content || "";
    setFormData({
      ...formData,
      content: content.substring(0, start) + imgMd + content.substring(end),
    });
    setShowContentImageUpload(false);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + imgMd.length;
    }, 100);
  };
}
