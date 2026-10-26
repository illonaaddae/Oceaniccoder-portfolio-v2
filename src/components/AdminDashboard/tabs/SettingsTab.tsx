import React from "react";
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

      {/* Signed in through GitHub: the password lives there. */}
      <p className={`text-sm ${theme === "dark" ? "text-slate-200/90" : "text-slate-700/80"}`}>
        You sign in with GitHub. Change your password and two-factor settings on GitHub.
      </p>
      <ComingSoonCard theme={theme} />
    </div>
  );
};
