import { useState, useEffect } from "react";
import type { GalleryImage } from "@/types";
import type { GalleryFormState, GalleryFormModalProps } from "./types";

const DEFAULT_FORM: GalleryFormState = {
  src: "",
  alt: "",
  caption: "",
  order: 0,
  isPublic: true,
};

export function useGalleryForm(
  isOpen: boolean,
  editingImage: GalleryImage | null | undefined,
  totalImages: number,
  onSubmit: GalleryFormModalProps["onSubmit"],
  onClose: () => void,
  theme: "light" | "dark"
) {
  const [form, setForm] = useState<GalleryFormState>(DEFAULT_FORM);
  const [previewError, setPreviewError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingImage) {
      setForm({
        src: editingImage.src || "",
        alt: editingImage.alt || "",
        caption: editingImage.caption || "",
        order: editingImage.order ?? 0,
        isPublic: editingImage.isPublic ?? true,
      });
    } else {
      setForm({
        ...DEFAULT_FORM,
        order: totalImages,
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

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-oceanic-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-oceanic-500/60"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

  const labelClass = `block text-sm font-semibold mb-2 ${
    theme === "dark" ? "text-slate-200" : "text-slate-700"
  }`;

  return {
    form,
    setForm,
    previewError,
    setPreviewError,
    loading,
    handleSubmit,
    inputClass,
    labelClass,
  };
}
