import React, { useState, useEffect, useCallback } from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, useLocation } from "react-router-dom";
import { PortfolioProvider } from "./Context";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import MainLayout from "./components/MainLayout";
import AnimatedRoutes from "./components/AnimatedRoutes";
import RouteChangeHandler from "./components/RouteChangeHandler";
import PageViewTracker from "./components/PageViewTracker";
import TerminalLoader from "./components/TerminalLoader";
import Chatbot from "./components/Chatbot";
import useTheme from "./hooks/useTheme";
import { incrementSiteViews, hasAdminSession, logoutAdmin } from "./services/api";
import { prefetchRoutes } from "./utils/prefetchRoutes";
import { PREFETCHABLE_ROUTES } from "./routes/lazyComponents";
import { optOutOfTracking } from "./utils/analytics/consent";

// Client documents (quotes, invoices, receipts) are for reading and paying; the
// floating chat bubble sat beside their actions and pulled focus from them.
function SiteChatbot() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/q/") || pathname.startsWith("/receipt/")) return null;
  return <Chatbot />;
}

function App() {
  const { theme, toggleTheme } = useTheme();

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Warm public route chunks once idle. A deploy deletes the content-hashed
  // files an already-open tab points at, and Azure Static Web Apps has no asset
  // retention to prevent that — so getting the modules into the registry early
  // is what actually avoids the "Something went wrong" screen mid-session.
  useEffect(() => {
    prefetchRoutes(PREFETCHABLE_ROUTES);
  }, []);

  // Auth gate: the server-side session is the single source of truth (Static
  // Web Apps with the admin role). The legacy localStorage hash fallback was
  // removed (it exposed VITE_ADMIN_PASSWORD_HASH in the client bundle).
  useEffect(() => {
    hasAdminSession().then((hasSession) => {
      setIsAdminLoggedIn(hasSession);
      // The owner's browser: never count its page views.
      if (hasSession) optOutOfTracking();
    });
  }, []);

  const handleAdminLogout = useCallback(() => {
    logoutAdmin();
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
        <div className="min-h-dvh bg-white dark:bg-brand-dark-1 text-brand-ocean-1 dark:text-white">
          <BrowserRouter>
            <RouteErrorBoundary>
              <MainLayout theme={theme} toggleTheme={toggleTheme}>
                <TerminalLoader />
                <React.Suspense
                  fallback={
                    <div className="min-h-dvh" style={{ background: "var(--bg-primary)" }} />
                  }
                >
                  <AnimatedRoutes
                    isAdminLoggedIn={isAdminLoggedIn}
                    onAdminLogout={handleAdminLogout}
                  />
                  <RouteChangeHandler />
                  {/* Compared inline so a flag-off build drops the tracker entirely. */}
                  {import.meta.env.VITE_ANALYTICS_ENABLED === "true" && <PageViewTracker />}
                  <SiteChatbot />
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
