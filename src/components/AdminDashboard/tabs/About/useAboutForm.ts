import { useState, useEffect } from "react";
import type { About } from "@/types";

export interface AboutForm {
  title: string;
  subtitle: string;
  story: string;
  profileImage: string;
  resumeUrl: string;
  studentsMentored: number;
  techTalks: number;
  yearsExperience: number;
}

const fieldLabels: Record<keyof AboutForm, string> = {
  title: "Title",
  subtitle: "Subtitle",
  story: "Story",
  profileImage: "Profile Image",
  resumeUrl: "Resume URL",
  studentsMentored: "Students Mentored",
  techTalks: "Tech Talks",
  yearsExperience: "Years Experience",
};

export function useAboutForm(
  about: About | null,
  onSave: (about: Partial<About>) => Promise<void>,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void,
) {
  const [form, setForm] = useState<AboutForm>({
    title: "",
    subtitle: "",
    story: "",
    profileImage: "",
    resumeUrl: "",
    studentsMentored: 40,
    techTalks: 2,
    yearsExperience: 2,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (about) {
      setForm({
        title: about.title || "",
        subtitle: about.subtitle || "",
        story: about.story || "",
        profileImage: about.profileImage || "",
        resumeUrl: about.resumeUrl || "",
        studentsMentored: about.studentsMentored ?? 40,
        techTalks: about.techTalks ?? 2,
        yearsExperience: about.yearsExperience ?? 2,
      });
    }
  }, [about]);

  const handleSaveField = async (field: keyof AboutForm) => {
    setSaving(field);
    try {
      await onSave({ [field]: form[field] });
      setSaved(field);
      onSuccess?.(`${fieldLabels[field]} saved successfully!`);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      console.error(`Failed to save ${field}:`, err);
      onError?.(`Failed to save ${fieldLabels[field]}`);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving("all");
    try {
      await onSave(form);
      setSaved("all");
      onSuccess?.("All about information saved successfully!");
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      console.error("Failed to save about:", err);
      onError?.("Failed to save about information");
    } finally {
      setSaving(null);
    }
  };

  return { form, setForm, saving, saved, handleSaveField, handleSaveAll };
}
