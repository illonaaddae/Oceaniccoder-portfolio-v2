import React, { useEffect, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import useTheme from "@/hooks/useTheme";
import LoginHeader from "./AdminLogin/LoginHeader";
import LoginFooter from "./AdminLogin/LoginFooter";
import ProviderLogin from "./AdminLogin/ProviderLogin";
import type { LoginTheme } from "./AdminLogin/loginTheme";
import { getSwaUser } from "@/services/api/session";

const AdminLogin: React.FC = () => {
  const { theme: rawTheme, toggleTheme } = useTheme();
  const theme: LoginTheme = rawTheme === "light" || rawTheme === "dark" ? rawTheme : "dark";

  // Signed in through Static Web Apps but without the admin role: show the
  // user their id, which is what ADMIN_USER_IDS needs.
  const [signedInId, setSignedInId] = useState<string | null>(null);
  useEffect(() => {
    getSwaUser().then((user) =>
      setSignedInId(user && !user.userRoles.includes("admin") ? user.userId : null),
    );
  }, []);

  return (
    <div
      className={`min-h-dvh flex items-center justify-center p-4 relative z-40 transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-brand-dark-1 via-brand-dark-2 to-brand-dark-3"
          : "bg-gradient-to-br from-blue-50 via-white to-oceanic-50"
      }`}
    >
      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        className={`fixed top-4 right-4 p-3 rounded-xl border transition-all duration-200 ${
          theme === "dark"
            ? "bg-gray-800/80 border-gray-700 text-yellow-300 hover:bg-gray-700"
            : "bg-white/60 border-blue-200/40 text-slate-700 hover:bg-white/80"
        }`}
      >
        {theme === "dark" ? (
          <FaSun className="text-xl" aria-hidden="true" />
        ) : (
          <FaMoon className="text-xl" aria-hidden="true" />
        )}
      </button>

      <div className="w-full max-w-md">
        <LoginHeader theme={theme} />
        <ProviderLogin theme={theme} signedInId={signedInId} />
        <LoginFooter theme={theme} />
      </div>
    </div>
  );
};

export default AdminLogin;
