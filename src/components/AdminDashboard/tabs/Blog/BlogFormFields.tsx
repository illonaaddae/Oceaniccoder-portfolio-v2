import React from "react";
import { BlogPost } from "@/types";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CATEGORIES } from "./constants";
import { inputClass, labelClass } from "./formStyles";

interface BlogFormFieldsProps {
  formData: Partial<BlogPost>;
  setFormData: (data: Partial<BlogPost>) => void;
  theme: "light" | "dark";
}

export const BlogFormFields: React.FC<BlogFormFieldsProps> = ({ formData, setFormData, theme }) => (
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
        <label className={labelClass(theme)}>Read Time</label>
        <input
          type="text"
          value={formData.readTime}
          onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
          className={inputClass(theme)}
          placeholder="5 min read"
        />
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
