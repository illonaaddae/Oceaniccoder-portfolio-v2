import React, { useState, useEffect, FC, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PortfolioProvider } from "./Context";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import useTheme from "./hooks/useTheme";

import RouteChangeHandler from "./components/RouteChangeHandler";
import AdminLogin from "./components/AdminLogin";
import EventBanner from "./components/EventBanner";
import SupportButton from "./components/SupportButton";
import SkipToContent from "./components/SkipToContent";
import { logger } from "./utils/logger";
import {
  verifyAdminPassword,
  hashPassword,
  incrementSiteViews,
} from "./services/api";

// Eager load critical home component for instant display
import Home from "./components/HeroSection";
import About from "./components/AboutSection";
import Skills from "./components/SkillsSection";
import Projects from "./components/ProjectsSection";
import Testimonials from "./components/TestimonialsSection";
import Services from "./components/ServicesSection";
import Contact from "./components/ContactSection";

// Keep heavy/optional routes lazy-loaded
const ProjectCaseStudy = React.lazy(
  () => import("./components/ProjectCaseStudy"),
);
const Blog = React.lazy(() => import("./components/BlogSection"));
const BlogPost = React.lazy(() => import("./components/BlogPost"));
const AdminDashboard = React.lazy(() => import("./components/AdminDashboard"));
const NotFound = React.lazy(() => import("./components/NotFound"));

// Layout wrapper that conditionally shows Navbar/Footer based on route
const MainLayout: FC<{
  theme: string;
  toggleTheme: () => void;
  children: React.ReactNode;
}> = ({ theme, toggleTheme, children }) => {
  const location = useLocation();
  const isAdminRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/dashboard";

  return (
    <>
      {!isAdminRoute && <SkipToContent />}
      {!isAdminRoute && <EventBanner />}
      {!isAdminRoute && <Navbar theme={theme} toggleTheme={toggleTheme} />}
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      {!isAdminRoute && <Footer theme={theme} />}
      {!isAdminRoute && <ScrollToTop />}
      {!isAdminRoute && <SupportButton />}
    </>
  );
};

// Component that wraps Routes with animated page transitions
const AnimatedRoutes: FC<{
  isAdminLoggedIn: boolean;
  onAdminLogin: (password: string) => void;
  onAdminLogout: () => void;
}> = ({ isAdminLoggedIn, onAdminLogin, onAdminLogout }) => {
  const location = useLocation();

  const pageVariant = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <Home />
              <Skills />
              <Projects />
              <Testimonials />
            </motion.div>
          }
        />
        <Route
          path="/about"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <About />
            </motion.div>
          }
        />
        <Route
          path="/skills"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <Skills />
            </motion.div>
          }
        />
        <Route
          path="/projects"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <Projects />
            </motion.div>
          }
        />
        <Route
          path="/projects/:slug"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <ProjectCaseStudy />
            </motion.div>
          }
        />
        <Route
          path="/services"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <Services />
            </motion.div>
          }
        />
        <Route
          path="/blog"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <Blog />
            </motion.div>
          }
        />
        <Route
          path="/blog/:slug"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <BlogPost />
            </motion.div>
          }
        />
        <Route
          path="/contact"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <Contact />
            </motion.div>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            isAdminLoggedIn ? (
              <React.Suspense fallback={<div>Loading...</div>}>
                <AdminDashboard onLogout={onAdminLogout} isReadOnly={false} />
              </React.Suspense>
            ) : (
              <AdminLogin onLogin={onAdminLogin} />
            )
          }
        />
        {/* Public read-only dashboard view for recruiters */}
        <Route
          path="/dashboard"
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              {/* Only this route should be read-only */}
              <AdminDashboard isReadOnly={true} />
            </React.Suspense>
          }
        />
        {/* 404 catch-all route */}
        <Route
          path="*"
          element={
            <motion.div
              variants={pageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <NotFound />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  // useTheme handles persistence and html class toggling
  const { theme, toggleTheme } = useTheme();
  // Removed unused isLoggingIn state and splash-related states

  // Admin authentication state - check localStorage for session
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    const stored = localStorage.getItem("adminAuth");
    return stored === "authenticated";
  });

  const handleAdminLogin = useCallback(async (password: string) => {
    try {
      const isValid = await verifyAdminPassword(password);
      if (isValid) {
        localStorage.setItem("adminAuth", "authenticated");
        // Store hash for session validation
        const hash = await hashPassword(password);
        localStorage.setItem("adminHash", hash);
        setIsAdminLoggedIn(true);
      } else {
        // Replace alert with toast or custom notification
        // Use alert for feedback, suppress lint warning
        // eslint-disable-next-line no-alert
        window.alert("Invalid password");
      }
    } catch (error) {
      console.error("Login error:", error);
      // Use alert for feedback, suppress lint warning
      // eslint-disable-next-line no-alert
      window.alert("Login failed. Please try again.");
    }
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("adminHash");
    setIsAdminLoggedIn(false);
  };

  // Track site views when app loads (only once per session)
  // Track site views when app loads (only once per session)
  useEffect(() => {
    const hasTrackedView = sessionStorage.getItem("viewTracked");
    if (!hasTrackedView) {
      // Delay slightly to ensure page is interactive before tracking
      const timer = setTimeout(() => {
        incrementSiteViews()
          .then(() => {
            sessionStorage.setItem("viewTracked", "true");
          })
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
              <React.Suspense
                fallback={
                  <div
                    className="min-h-screen flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
                    }}
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading...</p>
                    </div>
                  </div>
                }
              >
                {/* Animated route transitions using Framer Motion */}
                <AnimatedRoutes
                  isAdminLoggedIn={isAdminLoggedIn}
                  onAdminLogin={handleAdminLogin}
                  onAdminLogout={handleAdminLogout}
                />
                {/* Manage scroll behavior on route changes */}
                <RouteChangeHandler />
              </React.Suspense>
            </MainLayout>
          </BrowserRouter>
        </div>
      </PortfolioProvider>
    </ErrorBoundary>
  );
}

export default App;
