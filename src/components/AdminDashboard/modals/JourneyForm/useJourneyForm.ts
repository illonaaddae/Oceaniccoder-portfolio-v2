import { useState, useEffect } from "react";
import type { Journey } from "@/types";
import type { JourneyFormState, JourneyFormModalProps } from "./types";

const DEFAULT_FORM: JourneyFormState = {
  role: "",
  company: "",
  period: "",
  location: "",
  description: "",
  achievements: [],
  color: "from-oceanic-500 to-oceanic-900",
};

type UseJourneyFormOptions = Omit<JourneyFormModalProps, "theme"> & {
  theme: "light" | "dark";
};

export function useJourneyForm({
  isOpen,
  editingJourney,
  onSubmit,
  onClose,
  theme,
}: UseJourneyFormOptions) {
  const [form, setForm] = useState<JourneyFormState>(DEFAULT_FORM);
  const [achievementInput, setAchievementInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingJourney) {
      setForm({
        role: editingJourney.role || "",
        company: editingJourney.company || "",
        period: editingJourney.period || "",
        location: editingJourney.location || "",
        description: editingJourney.description || "",
        achievements: editingJourney.achievements || [],
        color: editingJourney.color || "from-oceanic-500 to-oceanic-900",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setAchievementInput("");
  }, [editingJourney, isOpen]);

  const handleAddAchievement = () => {
    if (achievementInput.trim()) {
      setForm((prev) => ({
        ...prev,
        achievements: [...prev.achievements, achievementInput.trim()],
      }));
      setAchievementInput("");
    }
  };

  const handleRemoveAchievement = (index: number) => {
    setForm((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
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
    achievementInput,
    setAchievementInput,
    loading,
    handleAddAchievement,
    handleRemoveAchievement,
    handleSubmit,
    inputClass,
    labelClass,
  };
}
