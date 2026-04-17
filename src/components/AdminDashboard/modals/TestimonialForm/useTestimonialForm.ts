import { useState, useEffect } from "react";
import type { TestimonialFormState, TestimonialFormModalProps } from "./types";

type UseTestimonialFormArgs = Pick<
  TestimonialFormModalProps,
  "isOpen" | "onClose" | "onSubmit" | "theme" | "editingTestimonial"
>;

const DEFAULT_FORM: TestimonialFormState = {
  name: "",
  role: "",
  company: "",
  content: "",
  image: "",
  rating: 5,
  featured: false,
  order: 0,
};

export function useTestimonialForm({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingTestimonial,
}: UseTestimonialFormArgs) {
  const [form, setForm] = useState<TestimonialFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

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
      setForm(DEFAULT_FORM);
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

  return { form, setForm, loading, handleSubmit, inputClass, labelClass };
}
