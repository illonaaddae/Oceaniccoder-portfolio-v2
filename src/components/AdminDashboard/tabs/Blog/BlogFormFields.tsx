import React, { useEffect, useMemo, useRef } from "react";
import { BlogPost } from "@/types";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CATEGORIES } from "./constants";
import { estimateReadTime } from "./readTime";
import { inputClass, labelClass } from "./formStyles";

interface BlogFormFieldsProps {
  formData: Partial<BlogPost>;
  setFormData: (data: Partial<BlogPost>) => void;
  theme: "light" | "dark";
}

export const BlogFormFields: React.FC<BlogFormFieldsProps> = ({ formData, setFormData, theme }) => {
  const estimate = useMemo(() => estimateReadTime(formData.content || ""), [formData.content]);

  // Whether the value in the field was typed by hand. Once it was, the
  // estimate stops writing to it and only offers itself as a button — an
  // estimate that silently overrules a deliberate choice is worse than none.
  const manual = useRef(false);
  const lastAuto = useRef("");

  useEffect(() => {
    const current = formData.readTime || "";
    if (current && current !== lastAuto.current) manual.current = true;
    if (manual.current || !estimate.label || current === estimate.label) return;
    lastAuto.current = estimate.label;
    setFormData({ ...formData, readTime: estimate.label });
    // setFormData is rebuilt every render by the parent; depending on it here
    // would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.label, formData.readTime]);

  return (
    <>
      <div>
        <label className={labelClass(theme)}>Title *</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={inputClass(theme)}
          placeholder="Enter post title"
        />
      </div>
      <div>
        <label className={labelClass(theme)}>Slug (URL path)</label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          className={inputClass(theme)}
          placeholder="auto-generated-from-title"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass(theme)}>Category</label>
          <CustomSelect
            value={formData.category ?? ""}
            onChange={(value) => setFormData({ ...formData, category: value })}
            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            theme={theme}
            placeholder="Select category"
            ariaLabel="Select category"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className={`${labelClass(theme)} !mb-0`}>Read Time</label>
            {estimate.label && estimate.label !== formData.readTime && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, readTime: estimate.label })}
                title={`Estimated from ${estimate.words} words`}
                className={`text-xs font-medium rounded-md px-2 py-0.5 transition-colors ${
                  theme === "dark"
                    ? "text-oceanic-300 hover:bg-white/10"
                    : "text-oceanic-700 hover:bg-oceanic-50"
                }`}
              >
                Use {estimate.label}
              </button>
            )}
          </div>
          <input
            type="text"
            value={formData.readTime}
            onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
            className={inputClass(theme)}
            placeholder={estimate.label || "5 min read"}
          />
          {/* Filled from the body as you write, but only while you have not
            typed your own value — an estimate that overwrites a deliberate
            choice is worse than no estimate. */}
          <p className={`mt-1 text-xs ${theme === "dark" ? "text-gray-500" : "text-slate-400"}`}>
            {estimate.words > 0
              ? `${estimate.words.toLocaleString()} words · estimated ${estimate.label}`
              : "Fills itself in as you write."}
          </p>
        </div>
      </div>
      <div>
        <label className={labelClass(theme)}>Excerpt *</label>
        <textarea
          required
          value={formData.excerpt}
          onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
          rows={2}
          className={`${inputClass(theme)} resize-none`}
          placeholder="A brief summary of the post..."
        />
      </div>
    </>
  );
};
