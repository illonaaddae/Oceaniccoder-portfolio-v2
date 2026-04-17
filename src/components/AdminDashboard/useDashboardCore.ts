import { useState } from "react";
import useTheme from "@/hooks/useTheme";
import { useAdminData } from "./useAdminData";
import { useFilteredData } from "./useFilteredData";
import { useToast } from "./Toast";
import type { TabType } from "./types";

export function useDashboardCore() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    toasts,
    removeToast,
    success: showSuccess,
    error: showError,
  } = useToast();
  const { theme: rawTheme, toggleTheme } = useTheme();
  const theme = (
    rawTheme === "light" || rawTheme === "dark" ? rawTheme : "dark"
  ) as "light" | "dark";

  const adminData = useAdminData();
  const { messages, projects, certifications, gallery, loading } = adminData;

  const filtered = useFilteredData(
    searchQuery,
    messages,
    adminData.skills,
    projects,
    certifications,
    gallery,
    adminData.education,
    adminData.journey,
    adminData.blogPosts,
  );

  const newMessages = messages.filter(
    (m) => !m.status || m.status === "new",
  ).length;

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    toasts,
    removeToast,
    showSuccess,
    showError,
    theme,
    toggleTheme,
    adminData,
    filtered,
    messages,
    projects,
    certifications,
    gallery,
    loading,
    newMessages,
  };
}
