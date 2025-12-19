import React, { useState } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaEye,
  FaStar,
  FaRegStar,
  FaCalendarAlt,
  FaClock,
  FaTag,
  FaTimes,
  FaSave,
  FaImage,
} from "react-icons/fa";
import { BlogPost } from "@/types";
import { Modal } from "../modals/Modal";
import { ImageUpload } from "../ImageUpload";

interface BlogTabProps {
  blogPosts: BlogPost[];
  onAdd: (post: Partial<BlogPost>) => Promise<void>;
  onEdit: (id: string, post: Partial<BlogPost>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
  theme?: "light" | "dark";
}

const BlogTab: React.FC<BlogTabProps> = ({
  blogPosts,
  onAdd,
  onEdit,
  onDelete,
  loading,
  theme = "dark",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "",
    tags: [],
    publishedAt: new Date().toISOString().split("T")[0],
    readTime: "",
    image: "",
    featured: false,
    published: true,
  });
  const [tagInput, setTagInput] = useState("");
  const [showContentImageUpload, setShowContentImageUpload] = useState(false);
  const contentTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Insert image markdown at cursor position in content
  const insertImageToContent = (imageUrl: string) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = formData.content || "";
    const imageMarkdown = `\n![Image](${imageUrl})\n`;

    const newContent =
      content.substring(0, start) + imageMarkdown + content.substring(end);
    setFormData({ ...formData, content: newContent });
    setShowContentImageUpload(false);

    // Refocus textarea after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd =
        start + imageMarkdown.length;
    }, 100);
  };

  const filteredPosts = blogPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Generate slug from title if not provided
    const slug =
      formData.slug ||
      formData.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const postData = {
      ...formData,
      slug,
    };

    if (editingPost) {
      await onEdit(editingPost.$id, postData);
    } else {
      await onAdd(postData);
    }

    setShowModal(false);
    setEditingPost(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "",
      tags: [],
      publishedAt: new Date().toISOString().split("T")[0],
      readTime: "",
      image: "",
      featured: false,
      published: true,
    });
    setTagInput("");
    setShowContentImageUpload(false);
  };

  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
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
    });
    setShowModal(true);
  };

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

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this blog post?")) {
      await onDelete(id);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const categories = [
    "Development",
    "Leadership",
    "Community",
    "Career",
    "Tutorial",
    "Personal",
    "Tech News",
    "Other",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2
            className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Blog Posts
          </h2>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Create and manage your blog content
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPost(null);
            setShowModal(true);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm sm:text-base transition duration-200 border shadow-lg ${
            theme === "dark"
              ? "bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-500/50 text-white hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-500/20"
              : "bg-gradient-to-r from-emerald-500 to-cyan-500 border-emerald-400/50 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-emerald-400/30"
          }`}
        >
          <FaPlus /> New Post
        </button>
      </div>

      {/* Search */}
      <div
        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
          theme === "dark"
            ? "bg-gray-800/80 border border-gray-700 focus-within:border-cyan-500/60 focus-within:bg-gray-800"
            : "bg-white/60 border border-blue-200/40 focus-within:border-blue-400/60 focus-within:bg-white/80"
        }`}
      >
        <FaSearch
          className={`flex-shrink-0 transition-colors duration-300 ${
            theme === "dark" ? "text-gray-500" : "text-slate-500"
          }`}
        />
        <input
          type="text"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`flex-1 bg-transparent outline-none placeholder-opacity-60 transition-colors duration-300 ${
            theme === "dark"
              ? "text-white placeholder-slate-400"
              : "text-slate-900 placeholder-slate-500"
          }`}
        />
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="text-center py-12">
          <div
            className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${
              theme === "dark" ? "border-cyan-400" : "border-cyan-500"
            }`}
          ></div>
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Loading posts...
          </p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div
          className={`glass-card border rounded-2xl p-12 text-center transition-colors duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80"
              : "bg-gradient-to-br from-white/60 to-white/40 border-blue-200/40"
          }`}
        >
          <FaEdit
            className={`text-5xl mx-auto mb-4 transition-colors duration-300 ${
              theme === "dark" ? "text-gray-600" : "text-slate-400"
            }`}
          />
          <h3
            className={`text-xl font-medium mb-2 transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            No posts yet
          </h3>
          <p
            className={`mb-6 transition-colors duration-300 ${
              theme === "dark" ? "text-gray-400" : "text-slate-600"
            }`}
          >
            Create your first blog post to get started
          </p>
          <button
            onClick={() => {
              resetForm();
              setEditingPost(null);
              setShowModal(true);
            }}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 inline-flex items-center gap-2 shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-500/20"
                : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-emerald-400/30"
            }`}
          >
            <FaPlus /> Create Post
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.$id}
              className={`glass-card border rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
                theme === "dark"
                  ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600 hover:bg-gray-800/70"
                  : "bg-gradient-to-br from-white/60 to-white/40 border-blue-200/40 hover:border-blue-300/60 hover:bg-gradient-to-br hover:from-white/70 hover:to-white/50"
              }`}
            >
              <div className="flex gap-4">
                {/* Image */}
                {post.image && (
                  <div
                    className={`w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border ${
                      theme === "dark"
                        ? "border-gray-700"
                        : "border-blue-200/30"
                    }`}
                  >
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cef000da2150f34/view?project=6943431e00253c8f9883";
                      }}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {post.featured && (
                          <FaStar className="text-yellow-400 text-sm" />
                        )}
                        <h3
                          className={`font-semibold truncate transition-colors duration-300 ${
                            theme === "dark" ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {post.title}
                        </h3>
                      </div>
                      <p
                        className={`text-sm line-clamp-2 mb-2 transition-colors duration-300 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        {post.excerpt}
                      </p>
                      <div
                        className={`flex flex-wrap items-center gap-3 text-xs transition-colors duration-300 ${
                          theme === "dark" ? "text-slate-500" : "text-slate-500"
                        }`}
                      >
                        {post.category && (
                          <span
                            className={`px-2.5 py-1 rounded-lg font-medium ${
                              theme === "dark"
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                : "bg-cyan-100 text-cyan-700 border border-cyan-200"
                            }`}
                          >
                            {post.category}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt />
                          {formatDate(post.publishedAt)}
                        </span>
                        {post.readTime && (
                          <span className="flex items-center gap-1">
                            <FaClock />
                            {post.readTime}
                          </span>
                        )}
                        {!post.published && (
                          <span
                            className={`px-2.5 py-1 rounded-lg font-medium ${
                              theme === "dark"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-amber-100 text-amber-700 border border-amber-200"
                            }`}
                          >
                            Draft
                          </span>
                        )}
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5.5 mt-2">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className={`px-2 py-0.5 text-xs rounded-md flex items-center gap-1 ${
                                theme === "dark"
                                  ? "bg-white/8 text-slate-400 border border-white/10"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              <FaTag
                                className={
                                  theme === "dark"
                                    ? "text-cyan-400"
                                    : "text-cyan-600"
                                }
                              />
                              {tag}
                            </span>
                          ))}
                          {post.tags.length > 3 && (
                            <span
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-slate-500"
                                  : "text-slate-500"
                              }`}
                            >
                              +{post.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <a
                        href={`/blog/${post.slug || post.$id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2.5 rounded-lg transition-all duration-200 ${
                          theme === "dark"
                            ? "text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/15"
                            : "text-slate-500 hover:text-cyan-600 hover:bg-cyan-100"
                        }`}
                        title="View"
                      >
                        <FaEye />
                      </a>
                      <button
                        onClick={() => openEditModal(post)}
                        className={`p-2.5 rounded-lg transition-all duration-200 ${
                          theme === "dark"
                            ? "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/15"
                            : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-100"
                        }`}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(post.$id)}
                        className={`p-2.5 rounded-lg transition-all duration-200 ${
                          theme === "dark"
                            ? "text-slate-400 hover:text-red-400 hover:bg-red-500/15"
                            : "text-slate-500 hover:text-red-600 hover:bg-red-100"
                        }`}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPost(null);
          resetForm();
        }}
        title={editingPost ? "Edit Blog Post" : "Create New Blog Post"}
        theme={theme}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label
              className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
                  : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
              }`}
              placeholder="Enter post title"
            />
          </div>

          {/* Slug */}
          <div>
            <label
              className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              Slug (URL path)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
                  : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
              }`}
              placeholder="auto-generated-from-title"
            />
          </div>

          {/* Category & Read Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-sm font-semibold mb-2 ${
                  theme === "dark" ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                title="Select category"
                aria-label="Select category"
                className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  theme === "dark"
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white/50 border-blue-200/50 text-slate-900"
                }`}
              >
                <option
                  value=""
                  className={theme === "dark" ? "bg-slate-800" : "bg-white"}
                >
                  Select category
                </option>
                {categories.map((cat) => (
                  <option
                    key={cat}
                    value={cat}
                    className={theme === "dark" ? "bg-slate-800" : "bg-white"}
                  >
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className={`block text-sm font-semibold mb-2 ${
                  theme === "dark" ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Read Time
              </label>
              <input
                type="text"
                value={formData.readTime}
                onChange={(e) =>
                  setFormData({ ...formData, readTime: e.target.value })
                }
                className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  theme === "dark"
                    ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
                    : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
                }`}
                placeholder="5 min read"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label
              className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              Excerpt *
            </label>
            <textarea
              required
              value={formData.excerpt}
              onChange={(e) =>
                setFormData({ ...formData, excerpt: e.target.value })
              }
              rows={2}
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
                  : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
              }`}
              placeholder="A brief summary of the post..."
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className={`block text-sm font-semibold ${
                  theme === "dark" ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Content *{" "}
                <span className="text-cyan-500 font-normal">
                  (Markdown supported)
                </span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setShowContentImageUpload(!showContentImageUpload)
                }
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  showContentImageUpload
                    ? theme === "dark"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-cyan-100 text-cyan-700 border border-cyan-300"
                    : theme === "dark"
                    ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300"
                }`}
              >
                <FaImage className="text-xs" />
                Insert Image
              </button>
            </div>

            {/* Content Image Upload Panel */}
            {showContentImageUpload && (
              <div
                className={`mb-3 p-4 rounded-xl border ${
                  theme === "dark"
                    ? "bg-gray-800/50 border-gray-700"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <p
                  className={`text-xs mb-3 ${
                    theme === "dark" ? "text-gray-400" : "text-slate-500"
                  }`}
                >
                  Upload an image to insert into your content. The image
                  markdown will be added at your cursor position.
                </p>
                <ImageUpload
                  value=""
                  onChange={(url) => {
                    if (url) insertImageToContent(url);
                  }}
                  label=""
                />
              </div>
            )}

            <textarea
              ref={contentTextareaRef}
              required
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              rows={10}
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-sm ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
                  : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
              }`}
              placeholder="# Your content here...

Use Markdown formatting:
- **bold** and *italic*
- ## Headings
- ```javascript
code blocks
```
- [links](url)
- ![alt text](image-url) for images"
            />
          </div>

          {/* Tags */}
          <div>
            <label
              className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              Tags
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  theme === "dark"
                    ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
                    : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
                }`}
                placeholder="Add a tag and press Enter"
              />
              <button
                type="button"
                onClick={handleAddTag}
                title="Add tag"
                aria-label="Add tag"
                className="px-4 py-2.5 bg-cyan-500/20 text-cyan-600 rounded-xl hover:bg-cyan-500/30 transition-colors font-medium border border-cyan-500/30"
              >
                <FaPlus />
              </button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border ${
                      theme === "dark"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                        : "bg-cyan-100 text-cyan-700 border-cyan-300"
                    }`}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      title={`Remove ${tag}`}
                      aria-label={`Remove ${tag}`}
                      className="hover:text-red-400 transition-colors"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Featured Image Upload */}
          <div>
            <ImageUpload
              value={formData.image || ""}
              onChange={(url) => setFormData({ ...formData, image: url })}
              label="Featured Image"
            />
          </div>

          {/* Published Date */}
          <div>
            <label
              className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              Published Date
            </label>
            <input
              type="date"
              value={formData.publishedAt?.split("T")[0] || ""}
              onChange={(e) =>
                setFormData({ ...formData, publishedAt: e.target.value })
              }
              title="Select published date"
              aria-label="Select published date"
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white [color-scheme:dark]"
                  : "bg-white/50 border-blue-200/50 text-slate-900"
              }`}
            />
          </div>

          {/* Toggles */}
          <div
            className={`flex flex-wrap gap-6 p-4 rounded-xl border ${
              theme === "dark"
                ? "bg-white/5 border-white/10"
                : "bg-slate-50 border-blue-200/30"
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) =>
                  setFormData({ ...formData, featured: e.target.checked })
                }
                className="w-5 h-5 rounded text-yellow-500 focus:ring-yellow-400/50 focus:ring-offset-0"
              />
              <span
                className={`flex items-center gap-2 transition-colors ${
                  theme === "dark"
                    ? "text-slate-300 group-hover:text-white"
                    : "text-slate-600 group-hover:text-slate-900"
                }`}
              >
                {formData.featured ? (
                  <FaStar className="text-yellow-500" />
                ) : (
                  <FaRegStar
                    className={
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    }
                  />
                )}
                Featured Post
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) =>
                  setFormData({ ...formData, published: e.target.checked })
                }
                className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-400/50 focus:ring-offset-0"
              />
              <span
                className={`transition-colors ${
                  theme === "dark"
                    ? "text-slate-300 group-hover:text-white"
                    : "text-slate-600 group-hover:text-slate-900"
                }`}
              >
                {formData.published ? "✓ Published" : "Draft"}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div
            className={`flex justify-end gap-3 pt-4 border-t ${
              theme === "dark" ? "border-white/10" : "border-blue-200/30"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingPost(null);
                resetForm();
              }}
              className={`px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 border ${
                theme === "dark"
                  ? "bg-white/10 text-white hover:bg-white/20 border-white/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
              }`}
            >
              <FaTimes /> Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-xl hover:from-cyan-600 hover:to-emerald-600 transition-all font-medium shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              <FaSave /> {editingPost ? "Update" : "Create"} Post
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BlogTab;
