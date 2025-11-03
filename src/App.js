import React from "react";
import { PortfolioProvider } from "./Context";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import useTheme from "./hooks/useTheme";

// Code-split heavy sections
const AboutSection = React.lazy(() => import("./components/AboutSection"));
const SkillsSection = React.lazy(() => import("./components/SkillsSection"));
const ProjectsSection = React.lazy(() =>
  import("./components/ProjectsSection")
);
const BlogSection = React.lazy(() => import("./components/BlogSection"));
const ContactSection = React.lazy(() => import("./components/ContactSection"));

function App() {
  // useTheme handles persistence and html class toggling
  const { theme, toggleTheme } = useTheme();

  return (
    <PortfolioProvider>
      <div className="min-h-screen bg-white dark:bg-brand-dark-1 text-brand-ocean-1 dark:text-white">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <HeroSection />

        <React.Suspense
          fallback={
            <div className="p-8 text-center text-sm opacity-70">Loading…</div>
          }
        >
          <AboutSection />
          <SkillsSection />
          <ProjectsSection />
          <BlogSection />
          <ContactSection />
        </React.Suspense>

        <Footer />
        <ScrollToTop />
      </div>
    </PortfolioProvider>
  );
}

export default App;
