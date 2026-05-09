import React from "react";
import { FaFileAlt, FaFilePdf } from "react-icons/fa";
import type { AboutForm } from "./useAboutForm";
import { SaveButton } from "./SaveButton";
import ImageUpload from "../../ImageUpload";
import { getCardClass, getHeadingClass } from "./styles";

interface Props {
  form: AboutForm;
  setForm: React.Dispatch<React.SetStateAction<AboutForm>>;
  theme: "light" | "dark";
  isReadOnly: boolean;
  saving: string | null;
  saved: string | null;
  onSaveField: (field: keyof AboutForm) => void;
}

export const ResumeSection: React.FC<Props> = ({
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
        <FaFileAlt className="text-green-400" />
        Resume / CV
      </h3>
      <SaveButton
        field="resumeUrl"
        label="CV"
        saving={saving}
        saved={saved}
        onSave={onSaveField}
        isReadOnly={isReadOnly}
        theme={theme}
      />
    </div>

    {form.resumeUrl && (
      <div
        className={`mb-4 p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800/60 border-gray-700" : "bg-slate-50 border-slate-200"}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-lg ${theme === "dark" ? "bg-red-500/20" : "bg-red-100"}`}
          >
            <FaFilePdf className="text-2xl text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`}
            >
              Current Resume/CV
            </p>
            <a
              href={form.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-oceanic-500 hover:text-oceanic-500 truncate block"
            >
              {form.resumeUrl.length > 50
                ? form.resumeUrl.substring(0, 50) + "..."
                : form.resumeUrl}
            </a>
          </div>
          <a
            href={form.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${theme === "dark" ? "bg-oceanic-500/20 text-oceanic-500 hover:bg-oceanic-500/30" : "bg-oceanic-100 text-oceanic-600 hover:bg-oceanic-200"}`}
          >
            View
          </a>
        </div>
      </div>
    )}

    <ImageUpload
      value={form.resumeUrl}
      onChange={(url) => setForm({ ...form, resumeUrl: url })}
      theme={theme}
      allowPdf
      maxSizeMB={10}
    />
    <p
      className={`text-xs mt-2 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
    >
      Upload a PDF file or paste a link to your resume (Google Drive, Dropbox,
      etc.)
    </p>
  </div>
);

export default ResumeSection;
