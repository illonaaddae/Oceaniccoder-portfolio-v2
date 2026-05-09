import type { Testimonial } from "@/types";

export interface TestimonialFormState {
  name: string;
  role: string;
  company: string;
  content: string;
  image: string;
  rating: number;
  featured: boolean;
  order: number;
}

export interface TestimonialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    testimonial: Omit<Testimonial, "$id" | "$createdAt">
  ) => Promise<void>;
  theme: "light" | "dark";
  editingTestimonial?: Testimonial | null;
}
