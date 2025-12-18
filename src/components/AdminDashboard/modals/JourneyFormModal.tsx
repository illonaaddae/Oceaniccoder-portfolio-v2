import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { FaSave, FaPlus, FaTimes } from "react-icons/fa";
import type { Journey } from "@/types";

interface JourneyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<Journey, "$id">) => Promise<void>;
  theme: "light" | "dark";
  editingJourney?: Journey | null;
}

export const JourneyFormModal: React.FC<JourneyFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingJourney,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    role: "",
    company: "",
    period: "",
    location: "",
    description: "",
    achievements: [] as string[],
    color: "from-cyan-500 to-blue-500",
  });
  const [achievementInput, setAchievementInput] = useState("");

  useEffect(() => {
    if (editingJourney) {
      setForm({
        role: editingJourney.role || "",
        company: editingJourney.company || "",
        period: editingJourney.period || "",
        location: editingJourney.location || "",
        description: editingJourney.description || "",
        achievements: editingJourney.achievements || [],
        color: editingJourney.color || "from-cyan-500 to-blue-500",
      });
    } else {
      setForm({
        role: "",
        company: "",
        period: "",
        location: "",
        description: "",
        achievements: [],
        color: "from-cyan-500 to-blue-500",
      });
    }
  }, [editingJourney, isOpen]);

  const handleAddAchievement = () => {
    if (achievementInput.trim()) {
      setForm({
        ...form,
        achievements: [...form.achievements, achievementInput.trim()],
      });
      setAchievementInput("");
    }
  };

  const handleRemoveAchievement = (index: number) => {
    setForm({
      ...form,
      achievements: form.achievements.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error("Error submitting journey:", err);
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

  const colorOptions = [
    { value: "from-cyan-500 to-blue-500", label: "Cyan to Blue" },
    { value: "from-purple-500 to-pink-500", label: "Purple to Pink" },
    { value: "from-green-500 to-cyan-500", label: "Green to Cyan" },
    { value: "from-orange-500 to-red-500", label: "Orange to Red" },
    { value: "from-yellow-500 to-orange-500", label: "Yellow to Orange" },
    { value: "from-blue-500 to-purple-500", label: "Blue to Purple" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingJourney ? "Edit Journey" : "Add New Journey"}
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Role */}
          <div>
            <label className={labelClass}>Role/Title *</label>
            <input
              type="text"
              required
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
              placeholder="e.g., Senior Developer"
            />
          </div>

          {/* Company */}
          <div>
            <label className={labelClass}>Company *</label>
            <input
              type="text"
              required
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className={inputClass}
              placeholder="Company name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Period */}
          <div>
            <label className={labelClass}>Period *</label>
            <input
              type="text"
              required
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className={inputClass}
              placeholder="e.g., 2020 - Present"
            />
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={inputClass}
              placeholder="e.g., Accra, Ghana"
            />
          </div>
        </div>

        {/* Color Theme */}
        <div>
          <label className={labelClass}>Color Theme</label>
          <select
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            className={inputClass}
            title="Select color theme"
            aria-label="Select color theme"
          >
            {colorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Color Preview */}
          <div className="mt-2 flex items-center gap-2">
            <div
              className={`w-16 h-4 rounded bg-gradient-to-r ${form.color}`}
            />
            <span
              className={`text-xs ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Preview
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            placeholder="Brief description of your role and responsibilities..."
          />
        </div>

        {/* Achievements */}
        <div>
          <label className={labelClass}>Key Achievements</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={achievementInput}
              onChange={(e) => setAchievementInput(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" &&
                (e.preventDefault(), handleAddAchievement())
              }
              className={inputClass}
              placeholder="Add an achievement..."
            />
            <button
              type="button"
              onClick={handleAddAchievement}
              title="Add achievement"
              aria-label="Add achievement"
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                theme === "dark"
                  ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                  : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
              }`}
            >
              <FaPlus />
            </button>
          </div>
          {form.achievements.length > 0 && (
            <div className="space-y-2">
              {form.achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${
                    theme === "dark" ? "bg-white/5" : "bg-slate-50"
                  }`}
                >
                  <span
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    • {achievement}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAchievement(index)}
                    className="text-red-400 hover:text-red-300"
                    title="Remove achievement"
                    aria-label="Remove achievement"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
            {loading ? "Saving..." : editingJourney ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
