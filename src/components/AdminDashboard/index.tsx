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
import { ConfirmProvider } from "./ConfirmContext";

const SIDEBAR_COLLAPSED_KEY = "oc-admin-sidebar-collapsed";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, isReadOnly = false }) => {
  const s = useDashboardState(isReadOnly);

  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  const toggleCollapse = React.useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <ConfirmProvider>
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
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <main
          className={`flex-1 flex flex-col h-screen overflow-hidden ml-0 transition-all duration-300 relative z-0 ${
            isCollapsed ? "lg:ml-20" : "lg:ml-64"
          }`}
        >
          <DashboardHeader
            theme={s.theme}
            searchQuery={s.searchQuery}
            onSearchChange={s.setSearchQuery}
            notifications={s.notifications}
            notificationCount={s.notificationCount}
            onNavigate={(tab) => s.setActiveTab(tab)}
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
        <ToastContainer toasts={s.toasts} onRemove={s.removeToast} theme={s.theme} />
      </div>
    </ConfirmProvider>
  );
};

export default AdminDashboard;
