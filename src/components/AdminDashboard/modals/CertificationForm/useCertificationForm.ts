import { useState, useEffect } from "react";
import type React from "react";
import type { Certification } from "@/types";
import type { CertificationFormState } from "./types";

const DEFAULT_FORM: CertificationFormState = {
  title: "",
  issuer: "",
  date: "",
  credential: "",
  skills: [],
  platform: "",
  downloadLink: "",
  verifyLink: "",
  platformColor: "#3b82f6",
  image: "",
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
      setForm({
        title: editingCertification.title || "",
        issuer: editingCertification.issuer || "",
        date: editingCertification.date || "",
        credential: editingCertification.credential || "",
        skills: editingCertification.skills || [],
        platform: editingCertification.platform || "",
        downloadLink: editingCertification.downloadLink || "",
        verifyLink: editingCertification.verifyLink || "",
        platformColor: editingCertification.platformColor || "#3b82f6",
        image: editingCertification.image || "",
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
      await onSubmit(form);
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
