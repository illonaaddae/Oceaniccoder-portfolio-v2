import React from "react";
import { ChangePasswordCard } from "./Settings/ChangePasswordCard";
import { ComingSoonCard } from "./Settings/ComingSoonCard";

interface SettingsTabProps {
  theme: "light" | "dark";
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ theme }) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1
          className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
            theme === "dark" ? "text-white" : "text-slate-900"
          }`}
        >
          Settings
        </h1>
        <p
          className={`text-sm sm:text-base transition-colors duration-300 ${
            theme === "dark" ? "text-slate-200/90" : "text-slate-700/80"
          }`}
        >
          Configure your dashboard settings
        </p>
      </div>

      <ChangePasswordCard theme={theme} />
      <ComingSoonCard theme={theme} />
    </div>
  );
};
