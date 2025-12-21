import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { FaSave, FaEye, FaEyeSlash } from "react-icons/fa";
import type { GalleryImage } from "@/types";
import { ImageUpload } from "../ImageUpload";

interface GalleryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (image: Omit<GalleryImage, "$id">) => Promise<void>;
  theme: "light" | "dark";
  editingImage?: GalleryImage | null;
  totalImages?: number;
}

export const GalleryFormModal: React.FC<GalleryFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingImage,
  totalImages = 0,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    src: "",
    alt: "",
    caption: "",
    order: 0,
    isPublic: true,
  });
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (editingImage) {
      setForm({
        src: editingImage.src || "",
        alt: editingImage.alt || "",
        caption: editingImage.caption || "",
        order: editingImage.order || 0,
        isPublic: editingImage.isPublic ?? true,
      });
    } else {
      setForm({
        src: "",
        alt: "",
        caption: "",
        order: totalImages,
        isPublic: true,
      });
    }
    setPreviewError(false);
  }, [editingImage, isOpen, totalImages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error("Error submitting gallery image:", err);
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
      title={editingImage ? "Edit Gallery Image" : "Add Gallery Image"}
      theme={theme}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image Upload */}
        <div>
          <ImageUpload
            value={form.src}
            onChange={(url) => {
              setForm({ ...form, src: url });
              setPreviewError(false);
            }}
            label="Gallery Image *"
            theme={theme}
          />
        </div>

        {/* Alt Text */}
        <div>
          <label className={labelClass}>Alt Text *</label>
          <input
            type="text"
            required
            value={form.alt}
            onChange={(e) => setForm({ ...form, alt: e.target.value })}
            className={inputClass}
            placeholder="Describe the image for accessibility"
          />
        </div>

        {/* Caption */}
        <div>
          <label className={labelClass}>Caption</label>
          <input
            type="text"
            value={form.caption}
            onChange={(e) => setForm({ ...form, caption: e.target.value })}
            className={inputClass}
            placeholder="Optional caption to display"
          />
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
          <p
            className={`text-xs mt-1 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Lower numbers appear first
          </p>
        </div>

        {/* Visibility Toggle */}
        <div>
          <label className={labelClass}>Visibility</label>
          <button
            type="button"
            onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
              form.isPublic
                ? theme === "dark"
                  ? "bg-green-500/20 border-green-500/50 text-green-400"
                  : "bg-green-50 border-green-300 text-green-700"
                : theme === "dark"
                ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                : "bg-yellow-50 border-yellow-300 text-yellow-700"
            }`}
          >
            <div className="flex items-center gap-3">
              {form.isPublic ? (
                <FaEye className="text-lg" />
              ) : (
                <FaEyeSlash className="text-lg" />
              )}
              <span className="font-medium">
                {form.isPublic ? "Public" : "Hidden"}
              </span>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-lg ${
                form.isPublic
                  ? theme === "dark"
                    ? "bg-green-500/30"
                    : "bg-green-100"
                  : theme === "dark"
                  ? "bg-yellow-500/30"
                  : "bg-yellow-100"
              }`}
            >
              {form.isPublic ? "Visible to everyone" : "Admin only"}
            </span>
          </button>
          <p
            className={`text-xs mt-1 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            {form.isPublic
              ? "This image will be visible in the public gallery"
              : "This image will only be visible to admins"}
          </p>
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
            {loading ? "Saving..." : editingImage ? "Update" : "Add Image"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
