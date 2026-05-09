import type { Certification } from "@/types";

export interface CertificationFormState {
  title: string;
  issuer: string;
  date: string;
  credential: string;
  skills: string[];
  platform: string;
  downloadLink: string;
  verifyLink: string;
  platformColor: string;
  image: string;
}

export interface CertificationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (cert: Omit<Certification, "$id" | "$createdAt">) => Promise<void>;
  theme: "light" | "dark";
  editingCertification?: Certification | null;
}
