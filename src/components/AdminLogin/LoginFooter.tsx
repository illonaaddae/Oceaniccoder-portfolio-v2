import React from "react";
import { FaLock } from "react-icons/fa";
import type { LoginTheme } from "./useAdminLogin";

interface LoginFooterProps {
  theme: LoginTheme;
}

const LoginFooter: React.FC<LoginFooterProps> = ({ theme }) => {
  const dk = theme === "dark";
  return (
    <div
      className={`mt-8 p-4 border rounded-lg transition-all duration-200 ${
        dk
          ? "bg-gray-800/50 border-gray-700/80"
          : "bg-blue-50/50 border-blue-200/30"
      }`}
    >
      <p
        className={`text-xs text-center transition-colors duration-300 flex items-center justify-center gap-2 ${
          dk ? "text-slate-400" : "text-slate-600"
        }`}
      >
        <FaLock className="w-3 h-3" />
        This dashboard is password protected. Only you should have access.
      </p>
    </div>
  );
};

export default LoginFooter;
