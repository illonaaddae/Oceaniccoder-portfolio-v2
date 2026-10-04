import React from "react";
import { ChangePasswordCard } from "./Settings/ChangePasswordCard";
import { ComingSoonCard } from "./Settings/ComingSoonCard";
import { usesCosmos } from "@/services/api/dataApi";

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

      {usesCosmos ? (
        // Signed in through GitHub or Microsoft: the password lives there.
        <p className={`text-sm ${theme === "dark" ? "text-slate-200/90" : "text-slate-700/80"}`}>
          You sign in with GitHub or your email account. To change the email password, use
          &ldquo;Forgot password&rdquo; on the email sign-in page.
        </p>
      ) : (
        <ChangePasswordCard theme={theme} />
      )}
      <ComingSoonCard theme={theme} />
    </div>
  );
};
