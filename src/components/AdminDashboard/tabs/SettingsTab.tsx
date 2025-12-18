import { useState } from "react";
import {
  FaCog,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaCheck,
} from "react-icons/fa";
import { setAdminPassword, verifyAdminPassword } from "@/services/api";

interface SettingsTabProps {
  theme: "light" | "dark";
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ theme }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "All fields are required" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      // Verify current password
      const isValid = await verifyAdminPassword(currentPassword);
      if (!isValid) {
        setPasswordMessage({
          type: "error",
          text: "Current password is incorrect",
        });
        setIsChangingPassword(false);
        return;
      }

      // Set new password
      await setAdminPassword(newPassword);

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        type: "success",
        text: "Password changed successfully!",
      });

      // Update localStorage with new session
      localStorage.removeItem("adminAuth");
      localStorage.removeItem("adminHash");
      localStorage.setItem("adminAuth", "authenticated");
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordMessage({
        type: "error",
        text: "Failed to change password. Please try again.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const inputClasses = `w-full backdrop-blur-md border rounded-lg pl-4 pr-12 py-3 transition-all duration-300 focus:outline-none focus:ring-2 ${
    theme === "dark"
      ? "bg-white/5 border-white/10 text-white placeholder-slate-400 focus:ring-cyan-400 focus:border-cyan-400"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500 focus:ring-blue-400 focus:border-blue-400"
  }`;

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

      {/* Change Password Card */}
      <div
        className={`glass-card backdrop-blur-xl border rounded-2xl p-6 transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
            : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
        }`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`p-3 rounded-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/30"
                : "bg-gradient-to-r from-blue-400/30 to-cyan-400/30"
            }`}
          >
            <FaLock
              className={theme === "dark" ? "text-cyan-300" : "text-blue-600"}
            />
          </div>
          <div>
            <h2
              className={`text-xl font-semibold ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              Change Password
            </h2>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Update your admin dashboard password
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current Password */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-white" : "text-slate-700"
              }`}
            >
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={inputClasses}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                  theme === "dark"
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-white" : "text-slate-700"
              }`}
            >
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={inputClasses}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                  theme === "dark"
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-white" : "text-slate-700"
              }`}
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={inputClasses}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                  theme === "dark"
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Message */}
          {passwordMessage && (
            <div
              className={`p-3 rounded-lg ${
                passwordMessage.type === "success"
                  ? theme === "dark"
                    ? "bg-green-500/20 border border-green-500/50"
                    : "bg-green-50 border border-green-200"
                  : theme === "dark"
                  ? "bg-red-500/20 border border-red-500/50"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`text-sm flex items-center gap-2 ${
                  passwordMessage.type === "success"
                    ? theme === "dark"
                      ? "text-green-300"
                      : "text-green-600"
                    : theme === "dark"
                    ? "text-red-300"
                    : "text-red-600"
                }`}
              >
                {passwordMessage.type === "success" && <FaCheck />}
                {passwordMessage.text}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isChangingPassword}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 ${
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-500/40 to-blue-500/40 border border-cyan-400/50 hover:from-cyan-500/50 hover:to-blue-500/50 text-white"
                : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            }`}
          >
            {isChangingPassword ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Changing...
              </>
            ) : (
              <>
                <FaSave />
                Change Password
              </>
            )}
          </button>
        </form>
      </div>

      {/* Other Settings Placeholder */}
      <div
        className={`glass-card backdrop-blur-xl border rounded-2xl p-8 text-center transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
            : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
        }`}
      >
        <FaCog
          className={`text-4xl mx-auto mb-4 transition-colors duration-300 ${
            theme === "dark" ? "text-slate-400/50" : "text-slate-400/60"
          }`}
        />
        <p
          className={`transition-colors duration-300 ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}
        >
          More settings coming soon
        </p>
        <p
          className={`text-sm mt-2 transition-colors duration-300 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Dashboard preferences and configuration options will be available soon
        </p>
      </div>
    </div>
  );
};
