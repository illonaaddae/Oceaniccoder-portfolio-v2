import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PortfolioProvider } from "./Context";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import useTheme from "./hooks/useTheme";
import Splash from "./components/Splash";
import RouteChangeHandler from "./components/RouteChangeHandler";

// Code-split heavy routes
const Home = React.lazy(() => import("./components/HeroSection"));
const About = React.lazy(() => import("./components/AboutSection"));
const Skills = React.lazy(() => import("./components/SkillsSection"));
const Projects = React.lazy(() => import("./components/ProjectsSection"));
const Blog = React.lazy(() => import("./components/BlogSection"));
const Contact = React.lazy(() => import("./components/ContactSection"));

// Component that wraps Routes with animated page transitions
function AnimatedRoutes() {
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
              transition={{ duration: 0.45 }}
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
              transition={{ duration: 0.45 }}
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
              transition={{ duration: 0.45 }}
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
              transition={{ duration: 0.45 }}
            >
              <Projects />
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
              transition={{ duration: 0.45 }}
            >
              <Blog />
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
              transition={{ duration: 0.45 }}
            >
              <Contact />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  // useTheme handles persistence and html class toggling
  const { theme, toggleTheme } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [appVisible, setAppVisible] = useState(false);

  useEffect(() => {
    // Show the splash long enough to display typing + welcome; then fade out
    let tidy;
    const t = setTimeout(() => {
      setSplashExiting(true);
      tidy = setTimeout(() => setShowSplash(false), 500); // matches Splash transition duration
    }, 4200);
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
            className={`min-h-screen bg-white dark:bg-brand-dark-1 text-brand-ocean-1 dark:text-white transition-opacity duration-500 ${
              appVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <BrowserRouter>
              <Navbar theme={theme} toggleTheme={toggleTheme} />

              <React.Suspense
                fallback={
                  <div className="p-8 text-center text-sm opacity-70">
                    Loading…
                  </div>
                }
              >
                {/* Animated route transitions using Framer Motion */}
                <AnimatedRoutes />
                {/* Manage scroll behavior on route changes */}
                <RouteChangeHandler />
              </React.Suspense>

              <Footer />
              <ScrollToTop />
            </BrowserRouter>
          </div>
        )}
      </div>
    </PortfolioProvider>
  );
}

export default App;
