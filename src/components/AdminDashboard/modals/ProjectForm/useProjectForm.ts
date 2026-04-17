import { useState, useEffect } from "react";
import type { Project } from "@/types";
import type { ProjectFormData } from "./types";
import { DEFAULT_FORM_DATA } from "./types";

type ListKey = "technologies" | "keyFeatures" | "screenshots";

export function useProjectForm(
  editingProject: Project | null | undefined,
  isOpen: boolean,
  onSubmit: (project: Omit<Project, "$id" | "$createdAt">) => Promise<void>,
  onClose: () => void,
) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProjectFormData>({ ...DEFAULT_FORM_DATA });
  const [newTech, setNewTech] = useState("");
  const [newFeature, setNewFeature] = useState("");
  const [newScreenshot, setNewScreenshot] = useState("");

  useEffect(() => {
    if (editingProject) {
      setForm({
        title: editingProject.title || "",
        description: editingProject.description || "",
        longDescription: editingProject.longDescription || "",
        category: editingProject.category || "",
        technologies: editingProject.technologies || [],
        image: editingProject.image || "",
        liveUrl: editingProject.liveUrl || "",
        githubUrl: editingProject.githubUrl || "",
        featured: editingProject.featured || false,
        status: editingProject.status || "Completed",
        year: editingProject.year || new Date().getFullYear().toString(),
        slug: editingProject.slug || "",
        timeline: editingProject.timeline || "",
        role: editingProject.role || "",
        teamSize: editingProject.teamSize || "",
        lessonsLearned: editingProject.lessonsLearned || "",
        keyFeatures: editingProject.keyFeatures || [],
        screenshots: editingProject.screenshots || [],
      });
    } else {
      setForm({ ...DEFAULT_FORM_DATA });
    }
  }, [editingProject, isOpen]);

  const addToList = (
    key: ListKey,
    value: string,
    resetFn: (v: string) => void,
  ) => {
    const trimmed = value.trim();
    if (trimmed && !form[key].includes(trimmed)) {
      setForm({ ...form, [key]: [...form[key], trimmed] });
      resetFn("");
    }
  };

  const removeFromList = (key: ListKey, value: string) => {
    setForm({ ...form, [key]: form[key].filter((item) => item !== value) });
  };

  const generateSlug = () => {
    const slug = form.title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setForm({ ...form, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error("Error submitting project:", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setForm,
    loading,
    newTech,
    setNewTech,
    newFeature,
    setNewFeature,
    newScreenshot,
    setNewScreenshot,
    addToList,
    removeFromList,
    generateSlug,
    handleSubmit,
  };
}
