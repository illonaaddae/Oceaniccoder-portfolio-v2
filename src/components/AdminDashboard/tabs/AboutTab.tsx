import React, { useState, useEffect } from "react";
import { FaUser, FaSave, FaFileAlt, FaBook } from "react-icons/fa";
import type { About } from "@/types";

interface AboutTabProps {
  theme: "light" | "dark";
  loading: boolean;
  about: About | null;
  onSave: (about: Partial<About>) => Promise<void>;
}

export const AboutTab: React.FC<AboutTabProps> = ({
  theme,
  loading,
  about,
  onSave,
}) => {
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    story: "",
    profileImage: "",
    resumeUrl: "",
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
      });
    }
  }, [about]);

  const handleSaveField = async (field: keyof typeof form) => {
    setSaving(field);
    try {
      await onSave({ [field]: form[field] });
      setSaved(field);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      console.error(`Failed to save ${field}:`, err);
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
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      console.error("Failed to save about:", err);
    } finally {
      setSaving(null);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
    theme === "dark"
      ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

  const SaveButton = ({
    field,
    label,
  }: {
    field: keyof typeof form;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => handleSaveField(field)}
      disabled={saving === field}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
        saved === field
          ? "bg-green-500/20 text-green-400"
          : theme === "dark"
          ? "bg-white/10 text-white hover:bg-white/20"
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
            className={`glass-card backdrop-blur-xl border rounded-2xl p-6 ${
              theme === "dark"
                ? "bg-gradient-to-br from-white/10 to-white/5 border-white/20"
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
                  theme === "dark" ? "bg-white/10" : "bg-slate-100"
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
                />
              </div>
            </div>
          </div>

          {/* Resume Section */}
          <div
            className={`glass-card backdrop-blur-xl border rounded-2xl p-6 ${
              theme === "dark"
                ? "bg-gradient-to-br from-white/10 to-white/5 border-white/20"
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
            <input
              type="url"
              value={form.resumeUrl}
              onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
              className={inputClass}
              placeholder="https://drive.google.com/..."
            />
            <p
              className={`text-xs mt-2 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Paste a link to your resume (Google Drive, Dropbox, etc.)
            </p>
          </div>

          {/* Story Section */}
          <div
            className={`glass-card backdrop-blur-xl border rounded-2xl p-6 ${
              theme === "dark"
                ? "bg-gradient-to-br from-white/10 to-white/5 border-white/20"
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving === "all"}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition duration-300 disabled:opacity-50 ${
                saved === "all"
                  ? "bg-green-500/20 text-green-400 border border-green-400/30"
                  : "bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500"
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
        </div>
      )}
    </div>
  );
};
