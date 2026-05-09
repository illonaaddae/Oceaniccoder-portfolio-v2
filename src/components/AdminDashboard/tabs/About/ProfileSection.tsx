import React from "react";
import { FaUser } from "react-icons/fa";
import type { AboutForm } from "./useAboutForm";
import { SaveButton } from "./SaveButton";
import {
  getInputClass,
  getLabelClass,
  getCardClass,
  getHeadingClass,
} from "./styles";

interface Props {
  form: AboutForm;
  setForm: React.Dispatch<React.SetStateAction<AboutForm>>;
  theme: "light" | "dark";
  isReadOnly: boolean;
  saving: string | null;
  saved: string | null;
  onSaveField: (field: keyof AboutForm) => void;
}

export const ProfileSection: React.FC<Props> = ({
  form,
  setForm,
  theme,
  isReadOnly,
  saving,
  saved,
  onSaveField,
}) => {
  const inputClass = getInputClass(theme, isReadOnly);
  return (
    <div className={getCardClass(theme)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={getHeadingClass(theme)}>
          <FaUser className="text-oceanic-500" />
          Profile Information
        </h3>
        <SaveButton
          field="profileImage"
          label="Image"
          saving={saving}
          saved={saved}
          onSave={onSaveField}
          isReadOnly={isReadOnly}
          theme={theme}
        />
      </div>
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div
          className={`w-24 h-24 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden ${theme === "dark" ? "bg-gray-800 border border-gray-700" : "bg-slate-100"}`}
        >
          {form.profileImage ? (
            <img
              src={form.profileImage}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <FaUser
              className={`text-3xl ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
            />
          )}
        </div>
        <div className="flex-1 w-full">
          <label className={`block mb-2 ${getLabelClass(theme)}`}>
            Profile Image URL
          </label>
          <input
            type="url"
            value={form.profileImage}
            onChange={(e) => setForm({ ...form, profileImage: e.target.value })}
            className={inputClass}
            placeholder="https://..."
            readOnly={isReadOnly}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={getLabelClass(theme)}>Title/Name</label>
            <SaveButton
              field="title"
              label="Title"
              saving={saving}
              saved={saved}
              onSave={onSaveField}
              isReadOnly={isReadOnly}
              theme={theme}
            />
          </div>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            placeholder="Your name"
            readOnly={isReadOnly}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={getLabelClass(theme)}>Subtitle/Tagline</label>
            <SaveButton
              field="subtitle"
              label="Subtitle"
              saving={saving}
              saved={saved}
              onSave={onSaveField}
              isReadOnly={isReadOnly}
              theme={theme}
            />
          </div>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            className={inputClass}
            placeholder="e.g., Full Stack Developer"
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
