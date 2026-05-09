import React from "react";
import type { TestimonialFormState } from "./types";

interface ContentFieldProps {
  form: TestimonialFormState;
  setForm: React.Dispatch<React.SetStateAction<TestimonialFormState>>;
  inputClass: string;
  labelClass: string;
}

export const ContentField: React.FC<ContentFieldProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => {
  return (
    <div>
      <label className={labelClass}>Testimonial *</label>
      <textarea
        required
        rows={4}
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
        className={inputClass}
        placeholder="What they said about your work..."
      />
    </div>
  );
};
