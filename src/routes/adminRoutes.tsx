import React from "react";
import { Route } from "react-router-dom";
import LoadingSpinner from "@/components/LoadingSpinner";
import AdminLogin from "@/components/AdminLogin";
import { AdminDashboard, AdminPasswordReset } from "./lazyComponents";

const Fallback = () => <LoadingSpinner />;

interface AdminRoutesProps {
  isAdminLoggedIn: boolean;
  onAdminLogin: (password: string) => void;
  onAdminLogout: () => void;
}

const adminRoutes = ({ isAdminLoggedIn, onAdminLogin, onAdminLogout }: AdminRoutesProps) => (
  <>
    <Route
      path="/admin/dashboard"
      element={
        isAdminLoggedIn ? (
          <React.Suspense fallback={<Fallback />}>
            <AdminDashboard onLogout={onAdminLogout} isReadOnly={false} />
          </React.Suspense>
        ) : (
          <AdminLogin onLogin={onAdminLogin} />
        )
      }
    />
    <Route
      path="/dashboard"
      element={
        <React.Suspense fallback={<Fallback />}>
          <AdminDashboard isReadOnly={true} />
        </React.Suspense>
      }
    />
    <Route
      path="/admin/reset-password"
      element={
        <React.Suspense fallback={<Fallback />}>
          <AdminPasswordReset />
        </React.Suspense>
      }
    />
  </>
);

export default adminRoutes;
