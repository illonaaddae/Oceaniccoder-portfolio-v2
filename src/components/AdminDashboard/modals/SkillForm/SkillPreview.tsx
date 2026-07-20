import React from "react";
import { renderIconByComponent } from "@/utils/data/skillIconRegistry.jsx";

interface SkillPreviewProps {
  name: string;
  percentage: number;
  theme: "light" | "dark";
  icon?: string;
}

export const SkillPreview: React.FC<SkillPreviewProps> = ({ name, percentage, theme, icon }) => {
  const iconEl = renderIconByComponent(icon, "text-xl");
  return (
    <div
      className={`p-4 rounded-xl border ${
        theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
      }`}
    >
      <p
        className={`text-sm font-medium mb-2 ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}
      >
        Preview
      </p>
      <div className="flex items-center justify-between">
        <span
          className={`flex items-center gap-2 font-medium ${
            theme === "dark" ? "text-white" : "text-slate-900"
          }`}
        >
          {iconEl && <span aria-hidden="true">{iconEl}</span>}
          {name || "Skill Name"}
        </span>
        <span className={`text-sm ${theme === "dark" ? "text-oceanic-500" : "text-oceanic-600"}`}>
          {percentage}%
        </span>
      </div>
      <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-oceanic-500 to-oceanic-900 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
