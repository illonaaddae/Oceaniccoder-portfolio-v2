import React, { useState, useEffect } from "react";
import { FaArrowRight, FaDownload, FaHeart } from "react-icons/fa";

const HeroSection = () => {
  const [currentRole, setCurrentRole] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const roles = [
    "Fullstack Developer",
    "Software Projects Coordinator",
    "Community Tech Leader",
    "Creative Coder",
    "Oceaniccoder 🌊",
  ];

  useEffect(() => {
    const currentString = roles[currentRole];
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseTime = isDeleting ? 500 : 2000;

    const timeout = setTimeout(() => {
      if (!isDeleting && displayText.length < currentString.length) {
        setDisplayText(currentString.substring(0, displayText.length + 1));
      } else if (!isDeleting && displayText.length === currentString.length) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && displayText.length > 0) {
        setDisplayText(currentString.substring(0, displayText.length - 1));
      } else if (isDeleting && displayText.length === 0) {
        setIsDeleting(false);
        setCurrentRole((prev) => (prev + 1) % roles.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentRole, roles]);

  const scrollToProjects = () => {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToAbout = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="min-h-screen flex items-center relative overflow-hidden pt-32 pb-20 lg:pt-40 xl:pt-48 hero-section"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--brand-ocean-1) 100%)",
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-10 left-10 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-blue-500/12 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-r from-purple-500/8 to-cyan-500/10 blur-3xl"></div>
        <div className="liquid-morph absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-r from-green-500/6 to-blue-500/8 blur-2xl"></div>
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        {/* Profile Image */}
        <div className="mb-12 lg:mb-16 xl:mb-20 flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>

            <div className="relative">
              <div className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 group-hover:scale-105 transition-transform duration-300">
                <img
                  src="/images/STEM.JPG"
                  alt="Illona Addae - Professional Developer Portrait"
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Status Badge */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 glass-card bg-gradient-to-r from-cyan-500/95 to-blue-500/95 backdrop-blur-sm border border-cyan-400/40 rounded-xl px-4 py-2 shadow-lg">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Available for Hire
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mb-8 lg:mb-12 space-y-4 lg:space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-bold leading-tight">
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-green-600 dark:from-cyan-400 dark:via-blue-400 dark:to-green-400 bg-clip-text text-transparent">
              Illona Addae
            </span>
          </h1>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold leading-tight">
            <span className="bg-gradient-to-r from-purple-600 via-cyan-600 to-blue-600 dark:from-purple-400 dark:via-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              Oceaniccoder
            </span>
          </h2>

          <p className="text-lg lg:text-xl xl:text-2xl max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto leading-relaxed text-gray-900 dark:text-gray-300">
            Full-Stack Developer & Creative Technologist crafting digital
            experiences that merge innovation with purpose.
          </p>
        </div>

        {/* Role Display */}
        <div className="mb-8 lg:mb-12 h-16 flex items-center justify-center">
          <div className="glass-card bg-white/90 dark:bg-gray-900/90 border border-cyan-500/30 rounded-xl px-6 py-3">
            <h2 className="text-lg lg:text-xl xl:text-2xl font-bold">
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                {displayText}
              </span>
              <span className="ml-1 text-cyan-500 animate-pulse">|</span>
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap justify-center mb-8">
          <button
            onClick={scrollToProjects}
            className="glass-btn bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:scale-105 transition-transform duration-300 shadow-lg"
          >
            <span>🚀</span>
            View My Projects
            <FaArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={scrollToContact}
            className="glass-btn border-2 border-green-500/50 text-green-600 dark:text-green-400 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors duration-300"
          >
            <span>💼</span>
            Hire Me
            <FaHeart className="w-4 h-4 text-red-500" />
          </button>
        </div>

        {/* Download CV */}
        <div className="mb-20 lg:mb-24">
          <a
            href="/path-to-your-cv.pdf"
            download
            className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors duration-300 group"
          >
            <FaDownload className="w-4 h-4 group-hover:animate-bounce" />
            <span className="text-lg">Download CV</span>
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <button
            onClick={scrollToAbout}
            className="flex flex-col items-center space-y-2 text-cyan-600 dark:text-cyan-400 hover:scale-110 transition-transform duration-300 animate-bounce"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            <span className="text-xs">Scroll</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
