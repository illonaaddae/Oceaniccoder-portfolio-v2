import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter } from "react-router-dom";
import { PortfolioProvider } from "./Context";
import ErrorBoundary from "./components/ErrorBoundary";
import MainLayout from "./components/MainLayout";
import AnimatedRoutes from "./components/AnimatedRoutes";
import RouteChangeHandler from "./components/RouteChangeHandler";
import TerminalLoader from "./components/TerminalLoader";
import Chatbot from "./components/Chatbot";
import useTheme from "./hooks/useTheme";
import { logger } from "./utils/logger";
import {
  verifyAdminPassword,
  hashPassword,
  incrementSiteViews,
  hasAppwriteSession,
  logoutAdmin,
} from "./services/api";

function App() {
  const { theme, toggleTheme } = useTheme();

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Auth gate: Appwrite session first, then hash-based fallback
  useEffect(() => {
    hasAppwriteSession().then((hasSession) => {
      if (hasSession) {
        setIsAdminLoggedIn(true);
        return;
      }
      // Fall back to stored password hash (offline/hash-based login)
      const storedHash = localStorage.getItem("adminHash");
      const expectedHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH as string | undefined;
      if (storedHash && expectedHash && storedHash === expectedHash) {
        setIsAdminLoggedIn(true);
      } else {
        localStorage.removeItem("adminAuth");
        localStorage.removeItem("adminHash");
        setIsAdminLoggedIn(false);
      }
    });
  }, []);

  const handleAdminLogin = useCallback(async (password: string) => {
    try {
      const isValid = await verifyAdminPassword(password);
      if (isValid) {
        localStorage.setItem("adminAuth", "authenticated");
        const hash = await hashPassword(password);
        localStorage.setItem("adminHash", hash);
        setIsAdminLoggedIn(true);
      } else {
        // eslint-disable-next-line no-alert
        window.alert("Invalid password");
      }
    } catch (error) {
      console.error("Login error:", error);
      // eslint-disable-next-line no-alert
      window.alert("Login failed. Please try again.");
    }
  }, []);

  const handleAdminLogout = useCallback(async () => {
    await logoutAdmin();
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("adminHash");
    setIsAdminLoggedIn(false);
  }, []);

  // Track site views once per session
  useEffect(() => {
    const hasTrackedView = sessionStorage.getItem("viewTracked");
    if (!hasTrackedView) {
      const timer = setTimeout(() => {
        incrementSiteViews()
          .then(() => sessionStorage.setItem("viewTracked", "true"))
          .catch(console.warn);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        logger.error("Application Error", {
          error: error.message,
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      <PortfolioProvider>
        <div className="min-h-screen bg-white dark:bg-brand-dark-1 text-brand-ocean-1 dark:text-white">
          <BrowserRouter>
            <MainLayout theme={theme} toggleTheme={toggleTheme}>
              <TerminalLoader />
              <React.Suspense fallback={<div className="min-h-screen bg-[#0d1117]" />}>
                <AnimatedRoutes
                  isAdminLoggedIn={isAdminLoggedIn}
                  onAdminLogin={handleAdminLogin}
                  onAdminLogout={handleAdminLogout}
                />
                <RouteChangeHandler />
                <Chatbot />
              </React.Suspense>
            </MainLayout>
          </BrowserRouter>
        </div>
      </PortfolioProvider>
    </ErrorBoundary>
  );
}

export default App;
