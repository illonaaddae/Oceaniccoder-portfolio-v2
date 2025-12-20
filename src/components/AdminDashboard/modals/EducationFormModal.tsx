import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { FaSave } from "react-icons/fa";
import type { Education } from "@/types";
import { ImageUpload } from "../ImageUpload";

interface EducationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (edu: Omit<Education, "$id">) => Promise<void>;
  theme: "light" | "dark";
  editingEducation?: Education | null;
}

export const EducationFormModal: React.FC<EducationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingEducation,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    institution: "",
    degree: "",
    field: "",
    period: "",
    description: "",
    universityLogo: "",
  });

  useEffect(() => {
    if (editingEducation) {
      setForm({
        institution: editingEducation.institution || "",
        degree: editingEducation.degree || "",
        field: editingEducation.field || "",
        period: editingEducation.period || "",
        description: editingEducation.description || "",
        universityLogo:
          editingEducation.universityLogo || editingEducation.logo || "",
      });
    } else {
      setForm({
        institution: "",
        degree: "",
        field: "",
        period: "",
        description: "",
        universityLogo: "",
      });
    }
  }, [editingEducation, isOpen]);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error("Error submitting education:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
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
      title={editingEducation ? "Edit Education" : "Add New Education"}
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Institution */}
          <div>
            <label className={labelClass}>Institution *</label>
            <input
              type="text"
              required
              value={form.institution}
              onChange={(e) =>
                setForm({ ...form, institution: e.target.value })
              }
              className={inputClass}
              placeholder="University/School name"
            />
          </div>

          {/* Degree */}
          <div>
            <label className={labelClass}>Degree *</label>
            <input
              type="text"
              required
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
              className={inputClass}
              placeholder="e.g., Bachelor of Science"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Field of Study */}
          <div>
            <label className={labelClass}>Field of Study</label>
            <input
              type="text"
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value })}
              className={inputClass}
              placeholder="e.g., Computer Science"
            />
          </div>

          {/* Period */}
          <div>
            <label className={labelClass}>Period *</label>
            <input
              type="text"
              required
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className={inputClass}
              placeholder="e.g., 2018 - 2022"
            />
          </div>
        </div>

        {/* Institution Logo */}
        <div>
          <ImageUpload
            value={form.universityLogo}
            onChange={(url) => setForm({ ...form, universityLogo: url })}
            label="Institution Logo"
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            placeholder="Brief description of your studies, achievements..."
          />
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
            {loading ? "Saving..." : editingEducation ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
