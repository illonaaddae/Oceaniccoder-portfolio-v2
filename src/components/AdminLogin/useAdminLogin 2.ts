import { useState } from "react";
import useTheme from "@/hooks/useTheme";
import { requestPasswordRecovery } from "@/services/api";

export type LoginTheme = "light" | "dark";

export function useAdminLogin(onLogin: (password: string) => void) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme: rawTheme, toggleTheme } = useTheme();
  const theme: LoginTheme = rawTheme === "light" || rawTheme === "dark" ? rawTheme : "dark";

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);

    setTimeout(() => {
      if (password.trim()) {
        onLogin(password);
      } else {
        setError("Please enter a password");
      }
      setIsLoading(false);
    }, 500);
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");
    if (!adminEmail) {
      setError(
        "Password recovery requires VITE_ADMIN_EMAIL to be configured. Use the legacy hash login or contact the site owner.",
      );
      return;
    }
    setRecovering(true);
    try {
      const email = await requestPasswordRecovery();
      setInfo(`Recovery link sent to ${email}. Check your inbox (and spam folder).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send recovery email.";
      setError(msg);
    } finally {
      setRecovering(false);
    }
  };

  return {
    password,
    setPassword,
    error,
    setError,
    info,
    isLoading,
    recovering,
    showPassword,
    setShowPassword,
    theme,
    toggleTheme,
    adminEmail,
    handleSubmit,
    handleForgotPassword,
  };
}
