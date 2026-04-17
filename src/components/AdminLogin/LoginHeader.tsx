import React from "react";
import { FaLock } from "react-icons/fa";
import type { LoginTheme } from "./useAdminLogin";

interface LoginHeaderProps {
  theme: LoginTheme;
}

const LoginHeader: React.FC<LoginHeaderProps> = ({ theme }) => {
  const dk = theme === "dark";
  return (
    <div className="text-center mb-12">
      <div
        className={`inline-flex items-center justify-center w-16 h-16 rounded-lg backdrop-blur-md border mb-6 ${
          dk
            ? "bg-gradient-to-r from-oceanic-500/30 to-oceanic-900/30 border-oceanic-500/40"
            : "bg-gradient-to-r from-blue-400/30 to-oceanic-400/30 border-blue-300/40"
        }`}
      >
        <FaLock
          className={`text-3xl ${dk ? "text-oceanic-500" : "text-oceanic-600"}`}
        />
      </div>
      <h1
        className={`text-4xl font-bold mb-2 transition-colors duration-300 ${
          dk ? "text-white" : "text-slate-900"
        }`}
      >
        Oceaniccoder
      </h1>
      <p
        className={`transition-colors duration-300 ${
          dk ? "text-slate-300/70" : "text-slate-600"
        }`}
      >
        Admin Dashboard
      </p>
    </div>
  );
};

export default LoginHeader;
