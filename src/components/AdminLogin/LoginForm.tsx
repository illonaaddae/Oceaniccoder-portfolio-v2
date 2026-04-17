import React from "react";
import { FaLock, FaUser, FaEye, FaEyeSlash } from "react-icons/fa";
import type { LoginTheme } from "./useAdminLogin";

interface LoginFormProps {
  theme: LoginTheme;
  password: string;
  setPassword: (val: string) => void;
  error: string;
  setError: (val: string) => void;
  isLoading: boolean;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  theme,
  password,
  setPassword,
  error,
  setError,
  isLoading,
  showPassword,
  setShowPassword,
  handleSubmit,
}) => {
  const dk = theme === "dark";
  return (
    <div
      className={`border rounded-2xl p-8 shadow-2xl transition-all duration-200 ${
        dk
          ? "bg-gray-800/80 border-gray-700/80 shadow-gray-900/50"
          : "bg-gradient-to-br from-white/80 to-white/60 border-blue-200/40 shadow-blue-200/20"
      }`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mb-8">
          <p
            className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
              dk ? "text-white" : "text-slate-900"
            }`}
          >
            Welcome back
          </p>
          <p
            className={`text-sm transition-colors duration-300 ${
              dk ? "text-slate-300/70" : "text-slate-600"
            }`}
          >
            Enter your admin password to continue
          </p>
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
              dk ? "text-white" : "text-slate-700"
            }`}
          >
            Admin Password
          </label>
          <div className="relative">
            <FaUser
              className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                dk ? "text-slate-400" : "text-slate-500"
              }`}
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter password..."
              className={`w-full border rounded-lg pl-12 pr-12 py-3 transition-all duration-200 focus:outline-none focus:ring-2 ${
                dk
                  ? "bg-gray-900/80 border-gray-700 text-white placeholder-gray-500 focus:ring-oceanic-500/50 focus:border-oceanic-500/60"
                  : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500 focus:ring-blue-400 focus:border-blue-400"
              }`}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                dk
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        {error && (
          <div
            className={`backdrop-blur-md border rounded-lg p-3 ${
              dk
                ? "glass-card bg-red-500/20 border-red-500/50"
                : "bg-red-50 border-red-200"
            }`}
          >
            <p className={`text-sm ${dk ? "text-red-100" : "text-red-600"}`}>
              {error}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full border font-medium py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
            dk
              ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 hover:from-oceanic-500 hover:to-oceanic-900 text-white shadow-oceanic-500/20"
              : "bg-gradient-to-r from-blue-500 to-oceanic-500 border-oceanic-500/50 hover:from-blue-600 hover:to-oceanic-600 text-white shadow-oceanic-500/20"
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <FaLock className="text-sm" />
              Sign In
            </>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            className={`text-sm transition-colors duration-300 ${
              dk
                ? "text-oceanic-500 hover:text-oceanic-400"
                : "text-oceanic-600 hover:text-oceanic-700"
            }`}
          >
            Forgot password?
          </button>
        </div>

        <p
          className={`text-xs text-center transition-colors duration-300 ${
            dk ? "text-slate-500" : "text-slate-500"
          }`}
        >
          Protected access • Only authorized administrators
        </p>
      </form>
    </div>
  );
};

export default LoginForm;
