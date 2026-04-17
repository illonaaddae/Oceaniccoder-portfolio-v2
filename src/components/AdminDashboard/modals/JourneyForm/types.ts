import type { Journey } from "@/types";

export interface JourneyFormState {
  role: string;
  company: string;
  period: string;
  location: string;
  description: string;
  achievements: string[];
  color: string;
}

export interface JourneyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<Journey, "$id">) => Promise<void>;
  theme: "light" | "dark";
  editingJourney?: Journey | null;
}
