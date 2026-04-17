import React from "react";
import { FaPlus, FaTimes } from "react-icons/fa";
import type { JourneyFormState } from "./types";

interface AchievementsFieldProps {
  form: JourneyFormState;
  setForm: React.Dispatch<React.SetStateAction<JourneyFormState>>;
  achievementInput: string;
  setAchievementInput: React.Dispatch<React.SetStateAction<string>>;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const AchievementsField: React.FC<AchievementsFieldProps> = ({
  form,
  setForm,
  achievementInput,
  setAchievementInput,
  inputClass,
  labelClass,
  theme,
}) => {
  const handleAdd = () => {
    if (achievementInput.trim()) {
      setForm((prev) => ({
        ...prev,
        achievements: [...prev.achievements, achievementInput.trim()],
      }));
      setAchievementInput("");
    }
  };

  const handleRemove = (index: number) => {
    setForm((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
  };

  return (
    <div>
      <label className={labelClass}>Key Achievements</label>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={achievementInput}
          onChange={(e) => setAchievementInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className={inputClass}
          placeholder="Add an achievement..."
        />
        <button
          type="button"
          onClick={handleAdd}
          title="Add achievement"
          aria-label="Add achievement"
          className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
            theme === "dark"
              ? "bg-oceanic-500/20 text-oceanic-500 hover:bg-oceanic-500/30"
              : "bg-oceanic-100 text-oceanic-700 hover:bg-oceanic-200"
          }`}
        >
          <FaPlus />
        </button>
      </div>

      {form.achievements.length > 0 && (
        <div className="space-y-2">
          {form.achievements.map((achievement, index) => (
            <div
              key={index}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${
                theme === "dark" ? "bg-white/5" : "bg-slate-50"
              }`}
            >
              <span
                className={`text-sm ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                • {achievement}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Remove achievement"
                aria-label="Remove achievement"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
