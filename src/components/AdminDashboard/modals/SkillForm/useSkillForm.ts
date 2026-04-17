import { useState, useEffect } from "react";
import type { Skill } from "@/types";
import type { SkillFormState } from "./types";

interface UseSkillFormOptions {
  isOpen: boolean;
  editingSkill?: Skill | null;
  onSubmit: (skill: Omit<Skill, "$id" | "$createdAt">) => Promise<void>;
  onClose: () => void;
  theme: "light" | "dark";
}

const DEFAULT_FORM: SkillFormState = {
  name: "",
  percentage: 80,
  category: "",
  icon: "",
};

export function useSkillForm({
  isOpen,
  editingSkill,
  onSubmit,
  onClose,
  theme,
}: UseSkillFormOptions) {
  const [form, setForm] = useState<SkillFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingSkill) {
      setForm({
        name: editingSkill.name || "",
        percentage: editingSkill.percentage || 80,
        category: editingSkill.category || "",
        icon: editingSkill.icon || "",
      });
    } else {
      setForm(DEFAULT_FORM);
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

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-oceanic-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-oceanic-500/60"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

  const labelClass = `block text-sm font-semibold mb-2 ${
    theme === "dark" ? "text-slate-200" : "text-slate-700"
  }`;

  return { form, setForm, loading, handleSubmit, inputClass, labelClass };
}
