import React from "react";
import type { FormFieldProps } from "./types";

export const LinksFields: React.FC<FormFieldProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className={labelClass}>Live URL</label>
        <input
          type="url"
          value={form.liveUrl}
          onChange={(e) => setForm({ ...form, liveUrl: e.target.value })}
          className={inputClass}
          placeholder="https://myproject.com"
        />
      </div>
      <div>
        <label className={labelClass}>GitHub URL</label>
        <input
          type="url"
          value={form.githubUrl}
          onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
          className={inputClass}
          placeholder="https://github.com/..."
        />
      </div>
    </div>
    <div>
      <label className={labelClass}>Demo Video URL</label>
      <input
        type="url"
        value={form.demoVideoUrl}
        onChange={(e) => setForm({ ...form, demoVideoUrl: e.target.value })}
        className={inputClass}
        placeholder="Direct MP4, YouTube, or Loom URL"
      />
      <p className="mt-1 text-xs opacity-60">
        Shown as a hover preview on the project card. Supports MP4, YouTube, and Loom.
      </p>
    </div>
  </div>
);
