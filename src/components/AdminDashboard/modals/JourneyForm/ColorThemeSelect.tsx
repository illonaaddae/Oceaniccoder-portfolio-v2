import React from "react";
import { colorOptions } from "./constants";
import type { JourneyFormState } from "./types";

interface ColorThemeSelectProps {
  form: JourneyFormState;
  setForm: React.Dispatch<React.SetStateAction<JourneyFormState>>;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const ColorThemeSelect: React.FC<ColorThemeSelectProps> = ({
  form,
  setForm,
  labelClass,
  theme,
}) => {
  const selected = colorOptions.find((o) => o.value === form.color) ?? colorOptions[0];

  return (
    <div>
      <label className={labelClass}>Color Theme</label>

      {/* Selected preview */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${form.color} shadow-md flex-shrink-0`}
        />
        <div>
          <p
            className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-slate-800"}`}
          >
            {selected.label.split(": ")[0]}
          </p>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            {selected.label.split(": ")[1] ?? ""}
          </p>
        </div>
      </div>

      {/* Swatch grid */}
      <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
        {colorOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => setForm((prev) => ({ ...prev, color: opt.value }))}
            className={`w-full aspect-square rounded-lg bg-gradient-to-br ${opt.value} transition-all duration-150 hover:scale-110 hover:shadow-lg ${
              form.color === opt.value
                ? "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110 shadow-lg"
                : "opacity-80 hover:opacity-100"
            }`}
            aria-label={opt.label}
            aria-pressed={form.color === opt.value ? "true" : "false"}
          />
        ))}
      </div>

      <p className={`text-xs mt-2 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
        Hover a swatch to see its name
      </p>
    </div>
  );
};
