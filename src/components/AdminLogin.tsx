import React, { useState } from "react";
import {
  FaLock,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import useTheme from "@/hooks/useTheme";

interface AdminLoginProps {
  onLogin: (password: string) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme: rawTheme, toggleTheme } = useTheme();
  const theme = rawTheme === "light" || rawTheme === "dark" ? rawTheme : "dark";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate auth delay
    setTimeout(() => {
      if (password.trim()) {
        onLogin(password);
      } else {
        setError("Please enter a password");
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative z-40 transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-brand-dark-1 via-brand-dark-2 to-brand-dark-3"
          : "bg-gradient-to-br from-blue-50 via-white to-cyan-50"
      }`}
    >
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-4 right-4 p-3 rounded-xl backdrop-blur-md border transition-all duration-300 ${
          theme === "dark"
            ? "bg-white/10 border-white/20 text-yellow-300 hover:bg-white/20"
            : "bg-white/60 border-blue-200/40 text-slate-700 hover:bg-white/80"
        }`}
      >
        {theme === "dark" ? (
          <FaSun className="text-xl" />
        ) : (
          <FaMoon className="text-xl" />
        )}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-lg backdrop-blur-md border mb-6 ${
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-cyan-400/40"
                : "bg-gradient-to-r from-blue-400/30 to-cyan-400/30 border-blue-300/40"
            }`}
          >
            <FaLock
              className={`text-3xl ${
                theme === "dark" ? "text-cyan-300" : "text-blue-600"
              }`}
            />
          </div>
          <h1
            className={`text-4xl font-bold mb-2 transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Oceaniccoder
          </h1>
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300/70" : "text-slate-600"
            }`}
          >
            Admin Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div
          className={`backdrop-blur-xl border rounded-2xl p-8 shadow-2xl transition-all duration-300 ${
            theme === "dark"
              ? "glass-card bg-gradient-to-br from-white/8 to-white/4 border-white/10"
              : "bg-gradient-to-br from-white/80 to-white/60 border-blue-200/40 shadow-blue-200/20"
          }`}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Welcome Message */}
            <div className="mb-8">
              <p
                className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                Welcome back
              </p>
              <p
                className={`text-sm transition-colors duration-300 ${
                  theme === "dark" ? "text-slate-300/70" : "text-slate-600"
                }`}
              >
                Enter your admin password to continue
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-700"
                }`}
              >
                Admin Password
              </label>
              <div className="relative">
                <FaUser
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
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
                  className={`w-full backdrop-blur-md border rounded-lg pl-12 pr-12 py-3 transition-all duration-300 focus:outline-none focus:ring-2 ${
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white placeholder-slate-400 focus:ring-cyan-400 focus:border-cyan-400"
                      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    theme === "dark"
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className={`backdrop-blur-md border rounded-lg p-3 ${
                  theme === "dark"
                    ? "glass-card bg-red-500/20 border-red-500/50"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-red-100" : "text-red-600"
                  }`}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full backdrop-blur-md border font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                theme === "dark"
                  ? "bg-gradient-to-r from-cyan-500/40 to-blue-500/40 border-cyan-400/50 hover:from-cyan-500/50 hover:to-blue-500/50 text-white shadow-cyan-500/20"
                  : "bg-gradient-to-r from-blue-500 to-cyan-500 border-blue-400/50 hover:from-blue-600 hover:to-cyan-600 text-white shadow-blue-400/30"
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

            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                className={`text-sm transition-colors duration-300 ${
                  theme === "dark"
                    ? "text-cyan-400 hover:text-cyan-300"
                    : "text-blue-600 hover:text-blue-700"
                }`}
              >
                Forgot password?
              </button>
            </div>

            {/* Info Text */}
            <p
              className={`text-xs text-center transition-colors duration-300 ${
                theme === "dark" ? "text-slate-500" : "text-slate-500"
              }`}
            >
              Protected access • Only authorized administrators
            </p>
          </form>
        </div>

        {/* Security Note */}
        <div
          className={`mt-8 p-4 border rounded-lg transition-all duration-300 ${
            theme === "dark"
              ? "bg-brand-ocean-1/10 border-brand-ocean-1/20"
              : "bg-blue-50/50 border-blue-200/30"
          }`}
        >
          <p
            className={`text-xs text-center transition-colors duration-300 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            🔒 This dashboard is password protected. Only you should have
            access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
