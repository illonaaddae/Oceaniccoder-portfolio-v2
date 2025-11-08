import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function App() {
  // useTheme handles persistence and html class toggling
  const { theme, toggleTheme } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show the splash for a slightly longer time so the slower animation completes
    const t = setTimeout(() => setShowSplash(false), 3200);
    return () => clearTimeout(t);
  }, []);

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
          <Splash />
        ) : (
          <BrowserRouter>
            <Navbar theme={theme} toggleTheme={toggleTheme} />

            <React.Suspense
              fallback={
                <div className="p-8 text-center text-sm opacity-70">
                  Loading…
                </div>
              }
            >
              <Routes>
                <Route
                  path="/"
                  element={
                    <>
                      <Home />
                      <Skills />
                      <Projects />
                    </>
                  }
                />
                <Route path="/about" element={<About />} />
                <Route path="/skills" element={<Skills />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/contact" element={<Contact />} />
              </Routes>
              {/* Manage scroll behavior on route changes */}
              <RouteChangeHandler />
            </React.Suspense>

            <Footer />
            <ScrollToTop />
          </BrowserRouter>
        )}
      </div>
    </PortfolioProvider>
  );
}

export default App;
