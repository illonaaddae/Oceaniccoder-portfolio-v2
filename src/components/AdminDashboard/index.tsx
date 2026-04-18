import React from "react";
import { useDashboardState } from "./useDashboardState";
import { buildTabContentProps } from "./buildTabContentProps";
import { buildModalsProps } from "./buildModalsProps";
import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { TabContent } from "./TabContent";
import { DashboardModals } from "./DashboardModals";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { ToastContainer } from "./Toast";
import type { AdminDashboardProps } from "./types";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  isReadOnly = false,
}) => {
  const s = useDashboardState(isReadOnly);

  return (
    <div
      className={`flex h-screen overflow-hidden transition-colors duration-300 ${
        s.theme === "dark"
          ? "bg-[#0a0f1a]"
          : "bg-gradient-to-br from-blue-50 via-white to-oceanic-50"
      }`}
    >
      <Sidebar
        activeTab={s.activeTab}
        onTabChange={s.setActiveTab}
        theme={s.theme}
        onThemeToggle={s.toggleTheme}
        onLogout={onLogout}
        isReadOnly={isReadOnly}
        pendingBookings={s.pendingBookings}
      />
      <main className="flex-1 flex flex-col h-screen overflow-hidden ml-0 lg:ml-64 transition-all duration-300 relative z-0">
        <DashboardHeader
          theme={s.theme}
          searchQuery={s.searchQuery}
          onSearchChange={s.setSearchQuery}
          newMessages={s.newMessages}
          onNotificationClick={() => s.setActiveTab("messages")}
        />
        <TabContent {...buildTabContentProps(s, isReadOnly)} />
      </main>
      <DashboardModals {...buildModalsProps(s)} />
      <DeleteConfirmModal
        deleteConfirm={s.deleteConfirmHook.deleteConfirm}
        theme={s.theme}
        onConfirm={s.deleteConfirmHook.confirmDelete}
        onCancel={s.deleteConfirmHook.cancelDelete}
      />
      <ToastContainer
        toasts={s.toasts}
        onRemove={s.removeToast}
        theme={s.theme}
      />
    </div>
  );
};

export default AdminDashboard;
