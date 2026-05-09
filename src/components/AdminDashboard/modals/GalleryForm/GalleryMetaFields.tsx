import React from "react";
import type { GalleryFormState } from "./types";

interface GalleryMetaFieldsProps {
  form: GalleryFormState;
  setForm: React.Dispatch<React.SetStateAction<GalleryFormState>>;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const GalleryMetaFields: React.FC<GalleryMetaFieldsProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
  theme,
}) => {
  return (
    <>
      {/* Alt Text */}
      <div>
        <label className={labelClass}>Alt Text *</label>
        <input
          type="text"
          required
          value={form.alt}
          onChange={(e) => setForm((prev) => ({ ...prev, alt: e.target.value }))}
          className={inputClass}
          placeholder="Describe the image for accessibility"
        />
      </div>

      {/* Caption */}
      <div>
        <label className={labelClass}>Caption</label>
        <input
          type="text"
          value={form.caption}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, caption: e.target.value }))
          }
          className={inputClass}
          placeholder="Optional caption to display"
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
        <p
          className={`text-xs mt-1 ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}
        >
          Lower numbers appear first
        </p>
      </div>
    </>
  );
};
