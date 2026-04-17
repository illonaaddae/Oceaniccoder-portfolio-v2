import type { Project } from "@/types";

export interface ProjectFormData {
  title: string;
  description: string;
  longDescription: string;
  category: string;
  technologies: string[];
  image: string;
  liveUrl: string;
  githubUrl: string;
  featured: boolean;
  status: string;
  year: string;
  slug: string;
  timeline: string;
  role: string;
  teamSize: string;
  lessonsLearned: string;
  keyFeatures: string[];
  screenshots: string[];
}

export interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Omit<Project, "$id" | "$createdAt">) => Promise<void>;
  theme: "light" | "dark";
  editingProject?: Project | null;
}

export interface FormFieldProps {
  form: ProjectFormData;
  setForm: React.Dispatch<React.SetStateAction<ProjectFormData>>;
  theme: "light" | "dark";
  inputClass: string;
  labelClass: string;
}

export const DEFAULT_FORM_DATA: ProjectFormData = {
  title: "",
  description: "",
  longDescription: "",
  category: "",
  technologies: [],
  image: "",
  liveUrl: "",
  githubUrl: "",
  featured: false,
  status: "Completed",
  year: new Date().getFullYear().toString(),
  slug: "",
  timeline: "",
  role: "",
  teamSize: "",
  lessonsLearned: "",
  keyFeatures: [],
  screenshots: [],
};
