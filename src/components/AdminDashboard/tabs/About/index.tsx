import React from "react";
import { FaSave } from "react-icons/fa";
import type { About } from "@/types";
import { useAboutForm } from "./useAboutForm";
import { ProfileSection } from "./ProfileSection";
import { ResumeSection } from "./ResumeSection";
import { StatsSection } from "./StatsSection";
import { StorySection } from "./StorySection";

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
  const { form, setForm, saving, saved, handleSaveField, handleSaveAll } =
    useAboutForm(about, onSave, onSuccess, onError);

  const shared = {
    form,
    setForm,
    theme,
    isReadOnly,
    saving,
    saved,
    onSaveField: handleSaveField,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            About Me
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
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
          <ProfileSection {...shared} />
          <ResumeSection {...shared} />
          <StatsSection {...shared} />
          <StorySection {...shared} />

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
                      ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border border-oceanic-500/50 text-white hover:from-oceanic-500 hover:to-oceanic-900 shadow-oceanic-500/20"
                      : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white hover:from-oceanic-400 hover:to-oceanic-800 shadow-oceanic-500/20"
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
