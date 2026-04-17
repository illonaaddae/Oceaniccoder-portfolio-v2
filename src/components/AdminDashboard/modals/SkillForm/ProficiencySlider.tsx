import React from "react";
import type { SkillFormState } from "./types";

interface ProficiencySliderProps {
  form: SkillFormState;
  setForm: React.Dispatch<React.SetStateAction<SkillFormState>>;
  theme: "light" | "dark";
  labelClass: string;
}

export const ProficiencySlider: React.FC<ProficiencySliderProps> = ({
  form,
  setForm,
  theme,
  labelClass,
}) => {
  return (
    <div>
      <label className={labelClass}>Proficiency: {form.percentage}%</label>
      <input
        type="range"
        min="0"
        max="100"
        value={form.percentage}
        onChange={(e) =>
          setForm({ ...form, percentage: parseInt(e.target.value) })
        }
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-oceanic-500"
        title="Skill proficiency percentage"
        aria-label="Skill proficiency percentage"
      />
      <div className="flex justify-between text-xs mt-1">
        <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
          Beginner
        </span>
        <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
          Expert
        </span>
      </div>
    </div>
  );
};
