import { useState, useEffect } from "react";
import type { Journey } from "@/types";
import type { JourneyFormState, JourneyFormModalProps } from "./types";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatJourneyPeriod = (
  startMonth: string,
  startYear: string,
  endMonth: string,
  endYear: string,
  isOngoing: boolean,
): string => {
  if (!startYear) return "";
  const startLabel = startMonth
    ? `${SHORT_MONTHS[parseInt(startMonth, 10) - 1]} ${startYear}`
    : startYear;

  if (isOngoing) return `${startLabel} – Present`;
  if (!endYear) return startLabel;

  const endLabel = endMonth ? `${SHORT_MONTHS[parseInt(endMonth, 10) - 1]} ${endYear}` : endYear;

  if (startYear === endYear && startMonth === endMonth) return startLabel;
  if (startYear === endYear && startMonth && endMonth) {
    return `${SHORT_MONTHS[parseInt(startMonth, 10) - 1]} – ${SHORT_MONTHS[parseInt(endMonth, 10) - 1]} ${endYear}`;
  }
  return `${startLabel} – ${endLabel}`;
};

const parseJourneyPeriod = (period: string) => {
  if (!period)
    return { startMonth: "", startYear: "", endMonth: "", endYear: "", isOngoing: false };

  const isOngoing = /present/i.test(period);
  const parts = period.split(/\s*[–-]\s*/);

  const parsePart = (part: string) => {
    const tokens = part.trim().split(" ");
    if (tokens.length === 2) {
      const mIdx = SHORT_MONTHS.findIndex((m) => m.toLowerCase() === tokens[0].toLowerCase());
      if (mIdx >= 0) return { month: String(mIdx + 1).padStart(2, "0"), year: tokens[1] };
      return { month: "", year: tokens[0] };
    }
    if (tokens.length === 1 && /^\d{4}$/.test(tokens[0])) return { month: "", year: tokens[0] };
    return { month: "", year: "" };
  };

  const start = parsePart(parts[0] || "");
  const end = isOngoing ? { month: "", year: "" } : parsePart(parts[1] || "");

  return {
    startMonth: start.month,
    startYear: start.year,
    endMonth: end.month,
    endYear: end.year,
    isOngoing,
  };
};

const DEFAULT_FORM: JourneyFormState = {
  role: "",
  company: "",
  period: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  isOngoing: false,
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
      const parsed = parseJourneyPeriod(editingJourney.period || "");
      setForm({
        role: editingJourney.role || "",
        company: editingJourney.company || "",
        period: editingJourney.period || "",
        startMonth: parsed.startMonth,
        startYear: parsed.startYear,
        endMonth: parsed.endMonth,
        endYear: parsed.endYear,
        isOngoing: parsed.isOngoing,
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
      const { startMonth, startYear, endMonth, endYear, isOngoing, ...rest } = form;
      const period =
        formatJourneyPeriod(startMonth, startYear, endMonth, endYear, isOngoing) || form.period;
      await onSubmit({ ...rest, period });
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
