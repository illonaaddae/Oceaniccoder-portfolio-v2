import React, { useState, useEffect, FC, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PortfolioProvider } from "./Context";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import useTheme from "./hooks/useTheme";
import Splash from "./components/Splash";
import RouteChangeHandler from "./components/RouteChangeHandler";
import AdminLogin from "./components/AdminLogin";
import EventBanner from "./components/EventBanner";
import SupportButton from "./components/SupportButton";
import SkipToContent from "./components/SkipToContent";
import { verifyAdminPassword, hashPassword } from "./services/api";

// Code-split heavy routes
const Home = React.lazy(() => import("./components/HeroSection"));
const About = React.lazy(() => import("./components/AboutSection"));
const Skills = React.lazy(() => import("./components/SkillsSection"));
const Projects = React.lazy(() => import("./components/ProjectsSection"));
const ProjectCaseStudy = React.lazy(
  () => import("./components/ProjectCaseStudy")
);
const Blog = React.lazy(() => import("./components/BlogSection"));
const BlogPost = React.lazy(() => import("./components/BlogPost"));
const Contact = React.lazy(() => import("./components/ContactSection"));
const AdminDashboard = React.lazy(() => import("./components/AdminDashboard"));

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
      {!isAdminRoute && <Footer />}
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
                <AdminDashboard onLogout={onAdminLogout} />
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
              <AdminDashboard isReadOnly={true} />
            </React.Suspense>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  // useTheme handles persistence and html class toggling
  const { theme, toggleTheme } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [appVisible, setAppVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin authentication state - check localStorage for session
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    const stored = localStorage.getItem("adminAuth");
    return stored === "authenticated";
  });

  const handleAdminLogin = useCallback(async (password: string) => {
    setIsLoggingIn(true);
    try {
      const isValid = await verifyAdminPassword(password);
      if (isValid) {
        localStorage.setItem("adminAuth", "authenticated");
        // Store hash for session validation
        const hash = await hashPassword(password);
        localStorage.setItem("adminHash", hash);
        setIsAdminLoggedIn(true);
      } else {
        alert("Invalid password");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("adminHash");
    setIsAdminLoggedIn(false);
  };

  useEffect(() => {
    // Show the splash long enough to display typing + welcome; then fade out
    let tidy;
    const t = setTimeout(() => {
      setSplashExiting(true);
      tidy = setTimeout(() => setShowSplash(false), 600);
    }, 7600);
    return () => {
      clearTimeout(t);
      if (tidy) clearTimeout(tidy);
    };
  }, []);

  // Control app fade-in when the splash is unmounted
  useEffect(() => {
    if (!showSplash) {
      // start in next frame so CSS transition runs
      requestAnimationFrame(() => setAppVisible(true));
    }
  }, [showSplash]);

  useEffect(() => {
    // When the splash hides, ensure the viewport is at the top immediately
    // so there's no flash. We also set scrollRestoration to manual via the
    // RouteChangeHandler; this immediate reset helps prevent visible jumps.
    if (!showSplash) {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch (e) {
        // ignore when not in browser
      }
    }
    return undefined;
  }, [showSplash]);

  return (
    <PortfolioProvider>
      <div className="min-h-screen bg-white dark:bg-brand-dark-1 text-brand-ocean-1 dark:text-white">
        {showSplash ? (
          <Splash exiting={splashExiting} />
        ) : (
          <div
            className={`min-h-screen transition-opacity duration-500 ${
              appVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <BrowserRouter>
              <MainLayout theme={theme} toggleTheme={toggleTheme}>
                <React.Suspense
                  fallback={
                    <div className="p-8 text-center text-sm opacity-70">
                      Loading…
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
        )}
      </div>
    </PortfolioProvider>
  );
}

export default App;
