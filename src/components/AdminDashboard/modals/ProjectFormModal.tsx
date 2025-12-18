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
  });
  const [newTech, setNewTech] = useState("");

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

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
    theme === "dark"
      ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
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
              <option value="Web Development">Web Development</option>
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
