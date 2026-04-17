import React from "react";
import { RatingStars } from "./RatingStars";
import type { TestimonialFormState } from "./types";

interface MetaFieldsProps {
  form: TestimonialFormState;
  setForm: React.Dispatch<React.SetStateAction<TestimonialFormState>>;
  theme: "light" | "dark";
  inputClass: string;
  labelClass: string;
}

export const MetaFields: React.FC<MetaFieldsProps> = ({
  form,
  setForm,
  theme,
  inputClass,
  labelClass,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Rating */}
        <div>
          <label className={labelClass}>Rating</label>
          <RatingStars
            rating={form.rating}
            onChange={(r) => setForm((prev) => ({ ...prev, rating: r }))}
            theme={theme}
          />
        </div>

        {/* Display Order */}
        <div>
          <label className={labelClass}>Display Order</label>
          <input
            type="number"
            value={form.order}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                order: parseInt(e.target.value) || 0,
              }))
            }
            className={inputClass}
            placeholder="0"
            min="0"
          />
        </div>
      </div>

      {/* Featured */}
      <div className="flex items-center">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, featured: e.target.checked }))
            }
            className="w-5 h-5 rounded border-2 text-purple-500 focus:ring-purple-400"
          />
          <span
            className={`font-medium ${
              theme === "dark" ? "text-slate-200" : "text-slate-700"
            }`}
          >
            Featured Testimonial
          </span>
        </label>
      </div>
    </>
  );
};
