import type { Skill } from "@/types";

export interface SkillFormState {
  name: string;
  percentage: number;
  category: string;
  icon: string;
}

export interface SkillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (skill: Omit<Skill, "$id" | "$createdAt">) => Promise<void>;
  theme: "light" | "dark";
  editingSkill?: Skill | null;
}
