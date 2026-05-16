import { useState, useEffect } from "react";
import type React from "react";
import type { Certification } from "@/types";
import type { CertificationFormState } from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const parseCertDate = (dateStr: string): { month: string; year: string } => {
  if (!dateStr) return { month: "", year: "" };
  // Try "Month YYYY" format e.g. "December 2024"
  const parts = dateStr.trim().split(" ");
  if (parts.length === 2) {
    const monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === parts[0].toLowerCase());
    if (monthIndex >= 0 && /^\d{4}$/.test(parts[1])) {
      return { month: String(monthIndex + 1).padStart(2, "0"), year: parts[1] };
    }
  }
  return { month: "", year: "" };
};

const formatCertDate = (month: string, year: string): string => {
  if (!month || !year) return "";
  const idx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[idx]} ${year}`;
};

const DEFAULT_FORM: CertificationFormState = {
  title: "",
  issuer: "",
  date: "",
  dateMonth: "",
  dateYear: "",
  credential: "",
  skills: [],
  platform: "",
  downloadLink: "",
  verifyLink: "",
  platformColor: "#3b82f6",
  image: "",
  platformIconUrl: "",
};

export function useCertificationForm(
  editingCertification: Certification | null | undefined,
  isOpen: boolean,
  onSubmit: (cert: Omit<Certification, "$id" | "$createdAt">) => Promise<void>,
  onClose: () => void,
  theme: "light" | "dark",
) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CertificationFormState>({ ...DEFAULT_FORM });
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    if (editingCertification) {
      const { month, year } = parseCertDate(editingCertification.date || "");
      setForm({
        title: editingCertification.title || "",
        issuer: editingCertification.issuer || "",
        date: editingCertification.date || "",
        dateMonth: month,
        dateYear: year,
        credential: editingCertification.credential || "",
        skills: editingCertification.skills || [],
        platform: editingCertification.platform || "",
        downloadLink: editingCertification.downloadLink || "",
        verifyLink: editingCertification.verifyLink || "",
        platformColor: editingCertification.platformColor || "#3b82f6",
        image: editingCertification.image || "",
        platformIconUrl: editingCertification.platformIconUrl || "",
      });
    } else {
      setForm({ ...DEFAULT_FORM });
    }
  }, [editingCertification, isOpen]);

  const updateForm = (updates: Partial<CertificationFormState>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      updateForm({ skills: [...form.skills, trimmed] });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    updateForm({ skills: form.skills.filter((s) => s !== skill) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { dateMonth, dateYear, ...rest } = form;
      await onSubmit({
        ...rest,
        date: formatCertDate(dateMonth, dateYear) || form.date,
      });
      onClose();
    } catch (err) {
      console.error("Error submitting certification:", err);
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
    updateForm,
    loading,
    newSkill,
    setNewSkill,
    handleAddSkill,
    handleRemoveSkill,
    handleSubmit,
    inputClass,
    labelClass,
  };
}
