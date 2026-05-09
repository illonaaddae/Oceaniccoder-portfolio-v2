import React from "react";
import { BlogPost } from "@/types";
import { ImageUpload } from "../../ImageUpload";
import { BlogFormToggles } from "./BlogFormToggles";
import { inputClass, labelClass } from "./formStyles";

interface BlogFormSettingsProps {
  formData: Partial<BlogPost>;
  setFormData: (data: Partial<BlogPost>) => void;
  theme: "light" | "dark";
}

export const BlogFormSettings: React.FC<BlogFormSettingsProps> = ({
  formData,
  setFormData,
  theme,
}) => (
  <>
    <div>
      <ImageUpload
        value={formData.image || ""}
        onChange={(url) => setFormData({ ...formData, image: url })}
        label="Featured Image"
        theme={theme}
      />
    </div>
    <div>
      <label className={labelClass(theme)}>Published Date</label>
      <input
        type="date"
        value={formData.publishedAt?.split("T")[0] || ""}
        onChange={(e) =>
          setFormData({ ...formData, publishedAt: e.target.value })
        }
        title="Select published date"
        aria-label="Select published date"
        className={`${inputClass(theme)} ${theme === "dark" ? "[color-scheme:dark]" : ""}`}
      />
    </div>
    <BlogFormToggles
      formData={formData}
      setFormData={setFormData}
      theme={theme}
    />
  </>
);
