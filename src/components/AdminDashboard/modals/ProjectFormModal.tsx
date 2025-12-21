import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import type { Project } from "@/types";
import { ImageUpload } from "../ImageUpload";

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Omit<Project, "$id" | "$createdAt">) => Promise<void>;
  theme: "light" | "dark";
  editingProject?: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingProject,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    longDescription: "",
    category: "",
    technologies: [] as string[],
    image: "",
    liveUrl: "",
    githubUrl: "",
    featured: false,
    status: "Completed",
    year: new Date().getFullYear().toString(),
    // Case Study Fields
    slug: "",
    timeline: "",
    role: "",
    teamSize: "",
    lessonsLearned: "",
    keyFeatures: [] as string[],
    screenshots: [] as string[],
  });
  const [newTech, setNewTech] = useState("");
  const [newFeature, setNewFeature] = useState("");
  const [newScreenshot, setNewScreenshot] = useState("");

  useEffect(() => {
    if (editingProject) {
      setForm({
        title: editingProject.title || "",
        description: editingProject.description || "",
        longDescription: editingProject.longDescription || "",
        category: editingProject.category || "",
        technologies: editingProject.technologies || [],
        image: editingProject.image || "",
        liveUrl: editingProject.liveUrl || "",
        githubUrl: editingProject.githubUrl || "",
        featured: editingProject.featured || false,
        status: editingProject.status || "Completed",
        year: editingProject.year || new Date().getFullYear().toString(),
        // Case Study Fields
        slug: editingProject.slug || "",
        timeline: editingProject.timeline || "",
        role: editingProject.role || "",
        teamSize: editingProject.teamSize || "",
        lessonsLearned: editingProject.lessonsLearned || "",
        keyFeatures: editingProject.keyFeatures || [],
        screenshots: editingProject.screenshots || [],
      });
    } else {
      setForm({
        title: "",
        description: "",
        longDescription: "",
        category: "",
        technologies: [],
        image: "",
        liveUrl: "",
        githubUrl: "",
        featured: false,
        status: "Completed",
        year: new Date().getFullYear().toString(),
        // Case Study Fields
        slug: "",
        timeline: "",
        role: "",
        teamSize: "",
        lessonsLearned: "",
        keyFeatures: [],
        screenshots: [],
      });
    }
  }, [editingProject, isOpen]);

  const handleAddTech = () => {
    if (newTech.trim() && !form.technologies.includes(newTech.trim())) {
      setForm({
        ...form,
        technologies: [...form.technologies, newTech.trim()],
      });
      setNewTech("");
    }
  };

  const handleRemoveTech = (tech: string) => {
    setForm({
      ...form,
      technologies: form.technologies.filter((t) => t !== tech),
    });
  };

  const handleAddFeature = () => {
    if (newFeature.trim() && !form.keyFeatures.includes(newFeature.trim())) {
      setForm({
        ...form,
        keyFeatures: [...form.keyFeatures, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (feature: string) => {
    setForm({
      ...form,
      keyFeatures: form.keyFeatures.filter((f) => f !== feature),
    });
  };

  const handleAddScreenshot = () => {
    if (
      newScreenshot.trim() &&
      !form.screenshots.includes(newScreenshot.trim())
    ) {
      setForm({
        ...form,
        screenshots: [...form.screenshots, newScreenshot.trim()],
      });
      setNewScreenshot("");
    }
  };

  const handleRemoveScreenshot = (url: string) => {
    setForm({
      ...form,
      screenshots: form.screenshots.filter((s) => s !== url),
    });
  };

  // Auto-generate slug from title
  const generateSlug = () => {
    const slug = form.title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setForm({ ...form, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error("Error submitting project:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

  const labelClass = `block text-sm font-semibold mb-2 ${
    theme === "dark" ? "text-slate-200" : "text-slate-700"
  }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProject ? "Edit Project" : "Add New Project"}
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Title */}
          <div>
            <label className={labelClass}>Project Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
              placeholder="My Awesome Project"
            />
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>Category *</label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
              title="Select project category"
              aria-label="Select project category"
            >
              <option value="">Select Category</option>
              <option value="Web App">Web App</option>
              <option value="Mobile App">Mobile App</option>
              <option value="Full Stack">Full Stack</option>
              <option value="AI/ML">AI/ML</option>
              <option value="Backend">Backend</option>
              <option value="Frontend">Frontend</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Short Description *</label>
          <textarea
            required
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            placeholder="Brief description of the project..."
          />
        </div>

        {/* Long Description */}
        <div>
          <label className={labelClass}>Full Description</label>
          <textarea
            rows={4}
            value={form.longDescription}
            onChange={(e) =>
              setForm({ ...form, longDescription: e.target.value })
            }
            className={inputClass}
            placeholder="Detailed description, features, challenges..."
          />
        </div>

        {/* Technologies */}
        <div>
          <label className={labelClass}>Technologies</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTech}
              onChange={(e) => setNewTech(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleAddTech())
              }
              className={inputClass}
              placeholder="Add technology (e.g., React, Node.js)"
            />
            <button
              type="button"
              onClick={handleAddTech}
              title="Add technology"
              aria-label="Add technology"
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                theme === "dark"
                  ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                  : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
              }`}
            >
              <FaPlus />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.technologies.map((tech) => (
              <span
                key={tech}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  theme === "dark"
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {tech}
                <button
                  type="button"
                  onClick={() => handleRemoveTech(tech)}
                  className="hover:text-red-400"
                  title={`Remove ${tech}`}
                  aria-label={`Remove ${tech}`}
                >
                  <FaTimes className="text-xs" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Project Image */}
        <div>
          <ImageUpload
            value={form.image}
            onChange={(url) => setForm({ ...form, image: url })}
            label="Project Image"
            theme={theme}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Year */}
          <div>
            <label className={labelClass}>Year</label>
            <input
              type="text"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className={inputClass}
              placeholder="2024"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Live URL */}
          <div>
            <label className={labelClass}>Live URL</label>
            <input
              type="url"
              value={form.liveUrl}
              onChange={(e) => setForm({ ...form, liveUrl: e.target.value })}
              className={inputClass}
              placeholder="https://myproject.com"
            />
          </div>

          {/* GitHub URL */}
          <div>
            <label className={labelClass}>GitHub URL</label>
            <input
              type="url"
              value={form.githubUrl}
              onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
              className={inputClass}
              placeholder="https://github.com/..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Status */}
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
              title="Select project status"
              aria-label="Select project status"
            >
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Planning">Planning</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Featured */}
          <div className="flex items-center pt-8">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
                className="w-5 h-5 rounded border-2 text-cyan-500 focus:ring-cyan-400"
              />
              <span
                className={`font-medium ${
                  theme === "dark" ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Featured Project
              </span>
            </label>
          </div>
        </div>

        {/* Case Study Section */}
        <div
          className={`border-t pt-6 mt-6 ${
            theme === "dark" ? "border-gray-700" : "border-slate-200"
          }`}
        >
          <h3
            className={`text-lg font-bold mb-4 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            📋 Case Study Details (Optional)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* Slug */}
            <div>
              <label className={labelClass}>URL Slug</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className={inputClass}
                  placeholder="my-awesome-project"
                />
                <button
                  type="button"
                  onClick={generateSlug}
                  title="Generate from title"
                  className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                    theme === "dark"
                      ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                      : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label className={labelClass}>Timeline</label>
              <input
                type="text"
                value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                className={inputClass}
                placeholder="3 months"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* Role */}
            <div>
              <label className={labelClass}>Your Role</label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputClass}
                placeholder="Lead Developer"
              />
            </div>

            {/* Team Size */}
            <div>
              <label className={labelClass}>Team Size</label>
              <input
                type="text"
                value={form.teamSize}
                onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                className={inputClass}
                placeholder="Solo / 3 developers"
              />
            </div>
          </div>

          {/* Lessons Learned */}
          <div className="mb-5">
            <label className={labelClass}>Lessons Learned</label>
            <textarea
              rows={3}
              value={form.lessonsLearned}
              onChange={(e) =>
                setForm({ ...form, lessonsLearned: e.target.value })
              }
              className={inputClass}
              placeholder="Key takeaways and insights from this project..."
            />
          </div>

          {/* Key Features */}
          <div className="mb-5">
            <label className={labelClass}>Key Features</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAddFeature())
                }
                className={inputClass}
                placeholder="Add a key feature"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                title="Add feature"
                aria-label="Add feature"
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                    : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                }`}
              >
                <FaPlus />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.keyFeatures.map((feature, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                    theme === "dark"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(feature)}
                    className="hover:text-red-400"
                    title={`Remove "${feature}"`}
                    aria-label={`Remove "${feature}"`}
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Screenshots */}
          <div>
            <label className={labelClass}>Screenshots (URLs)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={newScreenshot}
                onChange={(e) => setNewScreenshot(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(), handleAddScreenshot())
                }
                className={inputClass}
                placeholder="https://... (screenshot URL)"
              />
              <button
                type="button"
                onClick={handleAddScreenshot}
                title="Add screenshot"
                aria-label="Add screenshot"
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                    : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                }`}
              >
                <FaPlus />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.screenshots.map((url, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm max-w-xs truncate ${
                    theme === "dark"
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {url.length > 30 ? `${url.slice(0, 30)}...` : url}
                  <button
                    type="button"
                    onClick={() => handleRemoveScreenshot(url)}
                    className="hover:text-red-400 flex-shrink-0"
                    title="Remove screenshot"
                    aria-label="Remove screenshot"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              theme === "dark"
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500"
            }`}
          >
            <FaSave />
            {loading ? "Saving..." : editingProject ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
