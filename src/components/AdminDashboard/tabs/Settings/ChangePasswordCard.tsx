import React from "react";
import { FaLock, FaSave, FaCheck } from "react-icons/fa";
import { usePasswordForm } from "./usePasswordForm";
import { PasswordField } from "./PasswordField";

interface ChangePasswordCardProps {
  theme: "light" | "dark";
}

export const ChangePasswordCard: React.FC<ChangePasswordCardProps> = ({
  theme,
}) => {
  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isChangingPassword,
    passwordMessage,
    handleChangePassword,
  } = usePasswordForm();

  const inputClasses = `w-full border rounded-lg pl-4 pr-12 py-3 transition-all duration-200 focus:outline-none focus:ring-2 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:ring-oceanic-500/50 focus:border-oceanic-500/60"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500 focus:ring-blue-400 focus:border-blue-400"
  }`;

  return (
    <div
      className={`glass-card border rounded-2xl p-6 transition-colors duration-200 ${
        theme === "dark"
          ? "bg-gray-800/50 border-gray-700/80"
          : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`p-3 rounded-lg ${
            theme === "dark"
              ? "bg-gradient-to-r from-oceanic-500/30 to-oceanic-900/30"
              : "bg-gradient-to-r from-blue-400/30 to-oceanic-400/30"
          }`}
        >
          <FaLock
            className={theme === "dark" ? "text-oceanic-500" : "text-oceanic-600"}
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

      {/* Form */}
      <form onSubmit={handleChangePassword} className="space-y-4">
        <PasswordField
          label="Current Password"
          value={currentPassword}
          onChange={setCurrentPassword}
          show={showCurrentPassword}
          onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
          placeholder="Enter current password"
          theme={theme}
          inputClasses={inputClasses}
        />

        <PasswordField
          label="New Password"
          value={newPassword}
          onChange={setNewPassword}
          show={showNewPassword}
          onToggleShow={() => setShowNewPassword(!showNewPassword)}
          placeholder="Enter new password"
          theme={theme}
          inputClasses={inputClasses}
        />

        <PasswordField
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirmPassword}
          onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
          placeholder="Confirm new password"
          theme={theme}
          inputClasses={inputClasses}
        />

        {/* Status Message */}
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
          className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg ${
            theme === "dark"
              ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border border-oceanic-500/50 hover:from-oceanic-500 hover:to-oceanic-900 text-white shadow-oceanic-500/20"
              : "bg-gradient-to-r from-blue-500 to-oceanic-500 hover:from-blue-600 hover:to-oceanic-600 text-white shadow-oceanic-500/20"
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
  );
};
