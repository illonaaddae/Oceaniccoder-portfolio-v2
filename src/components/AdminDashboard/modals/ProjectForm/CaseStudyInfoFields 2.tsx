import React from "react";
import type { FormFieldProps } from "./types";

interface CaseStudyInfoFieldsProps extends FormFieldProps {
  onGenerateSlug: () => void;
}

export const CaseStudyInfoFields: React.FC<CaseStudyInfoFieldsProps> = ({
  form,
  setForm,
  theme,
  inputClass,
  labelClass,
  onGenerateSlug,
}) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
      <div>
        <label className={labelClass}>URL Slug</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className={inputClass}
            placeholder="my-awesome-project"
          />
          <button
            type="button"
            onClick={onGenerateSlug}
            title="Generate from title"
            className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
              theme === "dark"
                ? "bg-oceanic-500/20 text-oceanic-500 hover:bg-oceanic-500/30"
                : "bg-oceanic-100 text-oceanic-700 hover:bg-oceanic-200"
            }`}
          >
            Auto
          </button>
        </div>
      </div>
      <div>
        <label className={labelClass}>Timeline</label>
        <input
          type="text"
          value={form.timeline}
          onChange={(e) => setForm({ ...form, timeline: e.target.value })}
          className={inputClass}
          placeholder="3 months"
        />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
      <div>
        <label className={labelClass}>Your Role</label>
        <input
          type="text"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className={inputClass}
          placeholder="Lead Developer"
        />
      </div>
      <div>
        <label className={labelClass}>Team Size</label>
        <input
          type="text"
          value={form.teamSize}
          onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
          className={inputClass}
          placeholder="Solo / 3 developers"
        />
      </div>
    </div>
    <div className="mb-5">
      <label className={labelClass}>Lessons Learned</label>
      <textarea
        rows={3}
        value={form.lessonsLearned}
        onChange={(e) => setForm({ ...form, lessonsLearned: e.target.value })}
        className={inputClass}
        placeholder="Key takeaways and insights from this project..."
      />
    </div>
  </>
);
