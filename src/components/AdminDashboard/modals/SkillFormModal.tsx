import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { FaSave } from "react-icons/fa";
import type { Skill } from "@/types";

interface SkillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (skill: Omit<Skill, "$id" | "$createdAt">) => Promise<void>;
  theme: "light" | "dark";
  editingSkill?: Skill | null;
}

export const SkillFormModal: React.FC<SkillFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingSkill,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    percentage: 80,
    category: "",
    icon: "",
  });

  useEffect(() => {
    if (editingSkill) {
      setForm({
        name: editingSkill.name || "",
        percentage: editingSkill.percentage || 80,
        category: editingSkill.category || "",
        icon: editingSkill.icon || "",
      });
    } else {
      setForm({
        name: "",
        percentage: 80,
        category: "",
        icon: "",
      });
    }
  }, [editingSkill, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error("Error submitting skill:", err);
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

  const categories = [
    "Frontend",
    "Backend",
    "Database",
    "DevOps",
    "Mobile",
    "Design",
    "Tools",
    "Other",
  ];

  const iconOptions = [
    { value: "FaReact", label: "React" },
    { value: "FaNodeJs", label: "Node.js" },
    { value: "FaPython", label: "Python" },
    { value: "FaJs", label: "JavaScript" },
    { value: "FaHtml5", label: "HTML5" },
    { value: "FaCss3Alt", label: "CSS3" },
    { value: "FaDatabase", label: "Database" },
    { value: "FaDocker", label: "Docker" },
    { value: "FaGitAlt", label: "Git" },
    { value: "FaAws", label: "AWS" },
    { value: "FaFigma", label: "Figma" },
    { value: "FaCode", label: "Code" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSkill ? "Edit Skill" : "Add New Skill"}
      theme={theme}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Skill Name */}
        <div>
          <label className={labelClass}>Skill Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="e.g., React, TypeScript, Python"
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
            title="Select skill category"
            aria-label="Select skill category"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Proficiency */}
        <div>
          <label className={labelClass}>Proficiency: {form.percentage}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={form.percentage}
            onChange={(e) =>
              setForm({ ...form, percentage: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            title="Skill proficiency percentage"
            aria-label="Skill proficiency percentage"
          />
          <div className="flex justify-between text-xs mt-1">
            <span
              className={theme === "dark" ? "text-slate-400" : "text-slate-600"}
            >
              Beginner
            </span>
            <span
              className={theme === "dark" ? "text-slate-400" : "text-slate-600"}
            >
              Expert
            </span>
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className={labelClass}>Icon</label>
          <select
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            className={inputClass}
            title="Select skill icon"
            aria-label="Select skill icon"
          >
            <option value="">Select Icon (Optional)</option>
            {iconOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Preview */}
        <div
          className={`p-4 rounded-xl border ${
            theme === "dark"
              ? "bg-white/5 border-white/10"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <p
            className={`text-sm font-medium mb-2 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Preview
          </p>
          <div className="flex items-center justify-between">
            <span
              className={`font-medium ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              {form.name || "Skill Name"}
            </span>
            <span
              className={`text-sm ${
                theme === "dark" ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              {form.percentage}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${form.percentage}%` }}
            />
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
            {loading ? "Saving..." : editingSkill ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
