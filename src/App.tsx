import React, { useState, useEffect, useCallback } from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { PortfolioProvider } from "./Context";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import MainLayout from "./components/MainLayout";
import AnimatedRoutes from "./components/AnimatedRoutes";
import RouteChangeHandler from "./components/RouteChangeHandler";
import TerminalLoader from "./components/TerminalLoader";
import Chatbot from "./components/Chatbot";
import useTheme from "./hooks/useTheme";
import {
  verifyAdminPassword,
  incrementSiteViews,
  hasAppwriteSession,
  logoutAdmin,
} from "./services/api";

function App() {
  const { theme, toggleTheme } = useTheme();

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Auth gate: Appwrite server-side session is the single source of truth.
  // The legacy localStorage hash fallback was removed (it required exposing
  // VITE_ADMIN_PASSWORD_HASH in the client bundle).
  useEffect(() => {
    hasAppwriteSession().then((hasSession) => {
      setIsAdminLoggedIn(hasSession);
      if (!hasSession) {
        localStorage.removeItem("adminAuth");
        localStorage.removeItem("adminHash"); // clean up stale legacy key
      }
    });
  }, []);

  const handleAdminLogin = useCallback(async (password: string) => {
    try {
      const isValid = await verifyAdminPassword(password);
      if (isValid) {
        // verifyAdminPassword creates an Appwrite session; that session IS the
        // auth state. localStorage.adminAuth kept only as a UI hint for legacy
        // code paths that haven't been migrated yet — it's no longer a secret.
        localStorage.setItem("adminAuth", "authenticated");
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
    <HelmetProvider>
      <PortfolioProvider>
        <div className="min-h-screen bg-white dark:bg-brand-dark-1 text-brand-ocean-1 dark:text-white">
          <BrowserRouter>
            <RouteErrorBoundary>
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
            </RouteErrorBoundary>
          </BrowserRouter>
        </div>
      </PortfolioProvider>
    </HelmetProvider>
  );
}

export default App;
