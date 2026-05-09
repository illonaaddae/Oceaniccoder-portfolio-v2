import type { Education } from "@/types";

export interface EducationFormState {
  institution: string;
  degree: string;
  field: string;
  period: string;
  description: string;
  universityLogo: string;
  initials: string;
  gpa: string;
  classHonours: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  isOngoing: boolean;
  location: string;
  isVisible: boolean;
}

export interface EducationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (edu: Omit<Education, "$id">) => Promise<void>;
  theme: "light" | "dark";
  editingEducation?: Education | null;
}

export type FormUpdater = (updates: Partial<EducationFormState>) => void;
