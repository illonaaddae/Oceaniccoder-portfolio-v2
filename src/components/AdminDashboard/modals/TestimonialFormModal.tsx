import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { FaSave, FaStar } from "react-icons/fa";
import type { Testimonial } from "@/types";
import { ImageUpload } from "../ImageUpload";

interface TestimonialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    testimonial: Omit<Testimonial, "$id" | "$createdAt">
  ) => Promise<void>;
  theme: "light" | "dark";
  editingTestimonial?: Testimonial | null;
}

export const TestimonialFormModal: React.FC<TestimonialFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingTestimonial,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    company: "",
    content: "",
    image: "",
    rating: 5,
    featured: false,
    order: 0,
  });

  useEffect(() => {
    if (editingTestimonial) {
      setForm({
        name: editingTestimonial.name || "",
        role: editingTestimonial.role || "",
        company: editingTestimonial.company || "",
        content: editingTestimonial.content || "",
        image: editingTestimonial.image || "",
        rating: editingTestimonial.rating || 5,
        featured: editingTestimonial.featured || false,
        order: editingTestimonial.order || 0,
      });
    } else {
      setForm({
        name: "",
        role: "",
        company: "",
        content: "",
        image: "",
        rating: 5,
        featured: false,
        order: 0,
      });
    }
  }, [editingTestimonial, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error("Error submitting testimonial:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500/60"
      : "bg-white/50 border-purple-200/50 text-slate-900 placeholder-slate-500"
  }`;

  const labelClass = `block text-sm font-semibold mb-2 ${
    theme === "dark" ? "text-slate-200" : "text-slate-700"
  }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Name */}
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="John Doe"
            />
          </div>

          {/* Role */}
          <div>
            <label className={labelClass}>Role/Title *</label>
            <input
              type="text"
              required
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
              placeholder="CEO, Senior Developer, etc."
            />
          </div>
        </div>

        {/* Company */}
        <div>
          <label className={labelClass}>Company</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className={inputClass}
            placeholder="Company Name (optional)"
          />
        </div>

        {/* Testimonial Content */}
        <div>
          <label className={labelClass}>Testimonial *</label>
          <textarea
            required
            rows={4}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className={inputClass}
            placeholder="What they said about your work..."
          />
        </div>

        {/* Profile Image */}
        <div>
          <ImageUpload
            value={form.image}
            onChange={(url) => setForm({ ...form, image: url })}
            label="Profile Image (optional)"
            theme={theme}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Rating */}
          <div>
            <label className={labelClass}>Rating</label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm({ ...form, rating: star })}
                  className="focus:outline-none transition-transform hover:scale-110"
                  aria-label={`Rate ${star} stars`}
                >
                  <FaStar
                    className={`w-8 h-8 ${
                      star <= form.rating
                        ? "text-yellow-400"
                        : theme === "dark"
                        ? "text-gray-600"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Order */}
          <div>
            <label className={labelClass}>Display Order</label>
            <input
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm({ ...form, order: parseInt(e.target.value) || 0 })
              }
              className={inputClass}
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        {/* Featured */}
        <div className="flex items-center">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="w-5 h-5 rounded border-2 text-purple-500 focus:ring-purple-400"
            />
            <span
              className={`font-medium ${
                theme === "dark" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              Featured Testimonial
            </span>
          </label>
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
                : "bg-gradient-to-r from-purple-500 to-pink-400 text-white hover:from-purple-600 hover:to-pink-500"
            }`}
          >
            <FaSave />
            {loading ? "Saving..." : editingTestimonial ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
