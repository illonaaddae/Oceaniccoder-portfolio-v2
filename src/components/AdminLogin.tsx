import React from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { useAdminLogin } from "./AdminLogin/useAdminLogin";
import LoginHeader from "./AdminLogin/LoginHeader";
import LoginForm from "./AdminLogin/LoginForm";
import LoginFooter from "./AdminLogin/LoginFooter";

interface AdminLoginProps {
  onLogin: (password: string) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const {
    password,
    setPassword,
    error,
    setError,
    isLoading,
    showPassword,
    setShowPassword,
    theme,
    toggleTheme,
    handleSubmit,
  } = useAdminLogin(onLogin);

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative z-40 transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-brand-dark-1 via-brand-dark-2 to-brand-dark-3"
          : "bg-gradient-to-br from-blue-50 via-white to-oceanic-50"
      }`}
    >
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-4 right-4 p-3 rounded-xl border transition-all duration-200 ${
          theme === "dark"
            ? "bg-gray-800/80 border-gray-700 text-yellow-300 hover:bg-gray-700"
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
        <LoginHeader theme={theme} />
        <LoginForm
          theme={theme}
          password={password}
          setPassword={setPassword}
          error={error}
          setError={setError}
          isLoading={isLoading}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          handleSubmit={handleSubmit}
        />
        <LoginFooter theme={theme} />
      </div>
    </div>
  );
};

export default AdminLogin;
