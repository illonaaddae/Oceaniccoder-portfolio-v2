import React from "react";
import { CATEGORY_OPTIONS } from "./constants";
import type { FormFieldProps } from "./types";

export const BasicInfoFields: React.FC<FormFieldProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className={labelClass}>Project Title *</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
          placeholder="My Awesome Project"
        />
      </div>
      <div>
        <label className={labelClass}>Category *</label>
        <select
          required
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className={inputClass}
          title="Select project category"
          aria-label="Select project category"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
    <div>
      <label className={labelClass}>Short Description *</label>
      <textarea
        required
        rows={2}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className={inputClass}
        placeholder="Brief description of the project..."
      />
    </div>
    <div>
      <label className={labelClass}>Full Description</label>
      <textarea
        rows={4}
        value={form.longDescription}
        onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
        className={inputClass}
        placeholder="Detailed description, features, challenges..."
      />
    </div>
  </>
);
