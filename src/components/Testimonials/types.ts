import type React from "react";

export interface TestimonialFormData {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  image: string;
}

export const INITIAL_FORM_DATA: TestimonialFormData = {
  name: "",
  role: "",
  company: "",
  content: "",
  rating: 5,
  image: "",
};

export const SECTION_GRADIENT_STYLE: React.CSSProperties = {
  background:
    "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
};
