import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaSave,
  FaFileAlt,
  FaBook,
  FaFilePdf,
  FaChartBar,
  FaUsers,
  FaMicrophone,
  FaStar,
} from "react-icons/fa";
import type { About } from "@/types";
import ImageUpload from "../ImageUpload";

interface AboutTabProps {
  theme: "light" | "dark";
  loading: boolean;
  about: About | null;
  onSave: (about: Partial<About>) => Promise<void>;
  isReadOnly?: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const AboutTab: React.FC<AboutTabProps> = ({
  theme,
  loading,
  about,
  onSave,
  isReadOnly = false,
  onSuccess,
  onError,
}) => {
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    story: "",
    profileImage: "",
    resumeUrl: "",
    studentsMentored: 40,
    techTalks: 2,
    yearsExperience: 2,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (about) {
      setForm({
        title: about.title || "",
        subtitle: about.subtitle || "",
        story: about.story || "",
        profileImage: about.profileImage || "",
        resumeUrl: about.resumeUrl || "",
        studentsMentored: about.studentsMentored ?? 40,
        techTalks: about.techTalks ?? 2,
        yearsExperience: about.yearsExperience ?? 2,
      });
    }
  }, [about]);

  const fieldLabels: Record<keyof typeof form, string> = {
    title: "Title",
    subtitle: "Subtitle",
    story: "Story",
    profileImage: "Profile Image",
    resumeUrl: "Resume URL",
    studentsMentored: "Students Mentored",
    techTalks: "Tech Talks",
    yearsExperience: "Years Experience",
  };

  const handleSaveField = async (field: keyof typeof form) => {
    setSaving(field);
    try {
      await onSave({ [field]: form[field] });
      setSaved(field);
      onSuccess?.(`${fieldLabels[field]} saved successfully!`);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      console.error(`Failed to save ${field}:`, err);
      onError?.(`Failed to save ${fieldLabels[field]}`);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving("all");
    try {
      await onSave(form);
      setSaved("all");
      onSuccess?.("All about information saved successfully!");
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      console.error("Failed to save about:", err);
      onError?.("Failed to save about information");
    } finally {
      setSaving(null);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60 focus:bg-gray-800"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  } ${isReadOnly ? "cursor-not-allowed opacity-70" : ""}`;

  const SaveButton = ({
    field,
    label,
  }: {
    field: keyof typeof form;
    label: string;
  }) => {
    if (isReadOnly) return null;
    return (
      <button
        type="button"
        onClick={() => handleSaveField(field)}
        disabled={saving === field}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
          saved === field
            ? "bg-green-500/20 text-green-400"
            : theme === "dark"
            ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {saving === field ? (
          <>
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Saving...
          </>
        ) : saved === field ? (
          <>✓ Saved</>
        ) : (
          <>
            <FaSave className="text-xs" />
            Save {label}
          </>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            About Me
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Edit your personal story and about section
          </p>
        </div>
        {saved && (
          <span className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium">
            ✓ Saved successfully
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            Loading about...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Section */}
          <div
            className={`glass-card border rounded-2xl p-6 transition-colors duration-200 ${
              theme === "dark"
                ? "bg-gray-800/50 border-gray-700/80"
                : "bg-gradient-to-br from-white/60 to-white/40 border-blue-200/40"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-lg font-bold flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                <FaUser className="text-cyan-400" />
                Profile Information
              </h3>
              <SaveButton field="profileImage" label="Image" />
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div
                className={`w-24 h-24 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden ${
                  theme === "dark"
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-slate-100"
                }`}
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
                    className={`text-3xl ${
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    }`}
                  />
                )}
              </div>
              <div className="flex-1 w-full">
                <label
                  className={`block text-sm font-semibold mb-2 ${
                    theme === "dark" ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Profile Image URL
                </label>
                <input
                  type="url"
                  value={form.profileImage}
                  onChange={(e) =>
                    setForm({ ...form, profileImage: e.target.value })
                  }
                  className={inputClass}
                  placeholder="https://..."
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={`text-sm font-semibold ${
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    Title/Name
                  </label>
                  <SaveButton field="title" label="Title" />
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
                  <label
                    className={`text-sm font-semibold ${
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    Subtitle/Tagline
                  </label>
                  <SaveButton field="subtitle" label="Subtitle" />
                </div>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) =>
                    setForm({ ...form, subtitle: e.target.value })
                  }
                  className={inputClass}
                  placeholder="e.g., Full Stack Developer"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Resume Section */}
          <div
            className={`glass-card border rounded-2xl p-6 transition-colors duration-200 ${
              theme === "dark"
                ? "bg-gray-800/50 border-gray-700/80"
                : "bg-gradient-to-br from-white/60 to-white/40 border-blue-200/40"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-lg font-bold flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                <FaFileAlt className="text-green-400" />
                Resume / CV
              </h3>
              <SaveButton field="resumeUrl" label="CV" />
            </div>

            {/* PDF Preview */}
            {form.resumeUrl && (
              <div
                className={`mb-4 p-4 rounded-xl border ${
                  theme === "dark"
                    ? "bg-gray-800/60 border-gray-700"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${
                      theme === "dark" ? "bg-red-500/20" : "bg-red-100"
                    }`}
                  >
                    <FaFilePdf className="text-2xl text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Current Resume/CV
                    </p>
                    <a
                      href={form.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-500 hover:text-cyan-400 truncate block"
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      theme === "dark"
                        ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        : "bg-cyan-100 text-cyan-600 hover:bg-cyan-200"
                    }`}
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
              allowPdf={true}
              maxSizeMB={10}
            />
            <p
              className={`text-xs mt-2 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Upload a PDF file or paste a link to your resume (Google Drive,
              Dropbox, etc.)
            </p>
          </div>

          {/* Stats Section */}
          <div
            className={`glass-card border rounded-2xl p-6 transition-colors duration-200 ${
              theme === "dark"
                ? "bg-gray-800/50 border-gray-700/80"
                : "bg-gradient-to-br from-white/60 to-white/40 border-blue-200/40"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-lg font-bold flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                <FaChartBar className="text-cyan-400" />
                Stats (Displayed on About Page)
              </h3>
            </div>
            <p
              className={`text-sm mb-4 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              These stats are shown on your About page. The "Projects Completed"
              count is automatically calculated from your projects in the
              database.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={`flex items-center gap-2 text-sm font-semibold ${
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    <FaUsers className="text-green-400" />
                    Students Mentored
                  </label>
                  <SaveButton field="studentsMentored" label="Save" />
                </div>
                <input
                  type="number"
                  min="0"
                  value={form.studentsMentored}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      studentsMentored: parseInt(e.target.value) || 0,
                    })
                  }
                  className={inputClass}
                  placeholder="40"
                  readOnly={isReadOnly}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={`flex items-center gap-2 text-sm font-semibold ${
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    <FaMicrophone className="text-purple-400" />
                    Tech Talks Given
                  </label>
                  <SaveButton field="techTalks" label="Save" />
                </div>
                <input
                  type="number"
                  min="0"
                  value={form.techTalks}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      techTalks: parseInt(e.target.value) || 0,
                    })
                  }
                  className={inputClass}
                  placeholder="2"
                  readOnly={isReadOnly}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={`flex items-center gap-2 text-sm font-semibold ${
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    <FaStar className="text-orange-400" />
                    Years Experience
                  </label>
                  <SaveButton field="yearsExperience" label="Save" />
                </div>
                <input
                  type="number"
                  min="0"
                  value={form.yearsExperience}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      yearsExperience: parseInt(e.target.value) || 0,
                    })
                  }
                  className={inputClass}
                  placeholder="2"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Story Section */}
          <div
            className={`glass-card border rounded-2xl p-6 transition-colors duration-200 ${
              theme === "dark"
                ? "bg-gray-800/50 border-gray-700/80"
                : "bg-gradient-to-br from-white/60 to-white/40 border-blue-200/40"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-lg font-bold flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                <FaBook className="text-purple-400" />
                My Story
              </h3>
              <SaveButton field="story" label="Story" />
            </div>
            <textarea
              value={form.story}
              onChange={(e) => setForm({ ...form, story: e.target.value })}
              className={`${inputClass} min-h-[300px]`}
              placeholder="Write your story here... You can use multiple paragraphs to tell your journey, what drives you, and what you're passionate about."
              readOnly={isReadOnly}
            />
            <p
              className={`text-sm mt-2 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Tip: Use separate paragraphs to make your story more readable.
            </p>
          </div>

          {/* Save All Button */}
          {!isReadOnly && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving === "all"}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition duration-200 disabled:opacity-50 shadow-lg ${
                  saved === "all"
                    ? "bg-green-500/20 text-green-400 border border-green-400/30"
                    : theme === "dark"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-500/50 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
                    : "bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500 shadow-blue-400/30"
                }`}
              >
                <FaSave />
                {saving === "all"
                  ? "Saving All..."
                  : saved === "all"
                  ? "✓ All Saved!"
                  : "Save All Changes"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AboutTab;
