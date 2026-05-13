import { useState } from "react";
import { verifyAdminPassword, setAdminPassword, hashPassword } from "@/services/api";
import { account } from "@/lib/appwrite";

export interface PasswordMessage {
  type: "success" | "error";
  text: string;
}

export function usePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<PasswordMessage | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

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
      const isValid = await verifyAdminPassword(currentPassword);
      if (!isValid) {
        setPasswordMessage({
          type: "error",
          text: "Current password is incorrect",
        });
        setIsChangingPassword(false);
        return;
      }

      // Update Appwrite Auth account password (primary login path)
      try {
        await account.updatePassword(newPassword, currentPassword);
      } catch {
        // No active Appwrite session or not using Appwrite Auth — fine, continue
      }

      // Update legacy hash in settings collection (fallback login path)
      await setAdminPassword(newPassword);

      // Refresh localStorage hash so hash-based fallback stays valid
      const newHash = await hashPassword(newPassword);
      localStorage.setItem("adminHash", newHash);
      localStorage.setItem("adminAuth", "authenticated");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        type: "success",
        text: "Password changed successfully!",
      });
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

  return {
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
  };
}
