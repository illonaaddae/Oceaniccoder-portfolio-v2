import { useState } from "react";
import { verifyAdminPassword, setAdminPassword } from "@/services/api";

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

      await setAdminPassword(newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        type: "success",
        text: "Password changed successfully!",
      });

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
