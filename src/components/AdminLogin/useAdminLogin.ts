import { useState } from "react";
import useTheme from "@/hooks/useTheme";

export type LoginTheme = "light" | "dark";

export function useAdminLogin(onLogin: (password: string) => void) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme: rawTheme, toggleTheme } = useTheme();
  const theme: LoginTheme =
    rawTheme === "light" || rawTheme === "dark" ? rawTheme : "dark";

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

  return {
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
  };
}
