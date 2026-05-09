import React from "react";
import { FaBook } from "react-icons/fa";
import type { AboutForm } from "./useAboutForm";
import { SaveButton } from "./SaveButton";
import { getInputClass, getCardClass, getHeadingClass } from "./styles";

interface Props {
  form: AboutForm;
  setForm: React.Dispatch<React.SetStateAction<AboutForm>>;
  theme: "light" | "dark";
  isReadOnly: boolean;
  saving: string | null;
  saved: string | null;
  onSaveField: (field: keyof AboutForm) => void;
}

export const StorySection: React.FC<Props> = ({
  form,
  setForm,
  theme,
  isReadOnly,
  saving,
  saved,
  onSaveField,
}) => (
  <div className={getCardClass(theme)}>
    <div className="flex items-center justify-between mb-4">
      <h3 className={getHeadingClass(theme)}>
        <FaBook className="text-purple-400" />
        My Story
      </h3>
      <SaveButton
        field="story"
        label="Story"
        saving={saving}
        saved={saved}
        onSave={onSaveField}
        isReadOnly={isReadOnly}
        theme={theme}
      />
    </div>
    <textarea
      value={form.story}
      onChange={(e) => setForm({ ...form, story: e.target.value })}
      className={`${getInputClass(theme, isReadOnly)} min-h-[300px]`}
      placeholder="Write your story here... You can use multiple paragraphs to tell your journey, what drives you, and what you're passionate about."
      readOnly={isReadOnly}
    />
    <p
      className={`text-sm mt-2 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
    >
      Tip: Use separate paragraphs to make your story more readable.
    </p>
  </div>
);

export default StorySection;
