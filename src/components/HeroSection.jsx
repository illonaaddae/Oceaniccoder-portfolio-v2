import React, { useState, useEffect } from "react";
import {
  FaArrowRight,
  FaDownload,
  FaHeart,
  FaChevronDown,
} from "react-icons/fa";

const HeroSection = () => {
  const [currentRole, setCurrentRole] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const roles = React.useMemo(
    () => [
      "Software Engineer",
      "Front-End Developer",
      "Fullstack Developer",
      "Problem Solver",
      "Executive Director",
      "Future Robotics Innovator",
      "Community Tech Leader",
      "Creative Coder",
      " WordPress & Web Experience Designer",
      "UI/UX Thinker",
      "Continuous Learner",
      "Oceaniccoder 🌊",
    ],
    []
  );

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
      className="min-h-screen relative overflow-hidden pt-28 hero-section"
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

      <div className="container mx-auto px-6 text-center relative z-10 flex flex-col min-h-screen justify-center">
        {/* Profile Image - Enhanced Mobile Size */}
        <div className="mb-8 lg:mb-12 flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>

            <div className="relative">
              <div className="w-72 h-72 sm:w-80 sm:h-80 md:w-88 md:h-88 lg:w-96 lg:h-96 xl:w-[25rem] xl:h-[25rem] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 group-hover:scale-105 transition-transform duration-300">
                <img
                  src="/images/profile.webp"
                  srcSet="/images/profile.webp 1x, /images/profile.webp 2x"
                  alt="Illona Addae - Professional Developer Portrait"
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  width="1200"
                  height="1200"
                />
              </div>
            </div>

            {/* Status Badge */}
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
              <div className="glass-card bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md border border-green-400/30 rounded-xl px-5 py-2 shadow-xl">
                <span className="text-white text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Available for Hire
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mb-8 lg:mb-10 space-y-4 lg:space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-green-600 dark:from-cyan-400 dark:via-blue-400 dark:to-green-400 bg-clip-text text-transparent">
              Illona Addae
            </span>
          </h1>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-display font-bold leading-tight tracking-wide">
            <span className="bg-gradient-to-r from-purple-600 via-cyan-600 to-blue-600 dark:from-purple-400 dark:via-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              Oceaniccoder
            </span>
          </h2>

          <p className="text-base sm:text-lg lg:text-xl xl:text-2xl max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto leading-relaxed text-gray-200 dark:text-gray-300 font-light">
            <span className="text-white font-medium">
            I create products that connects people.
            </span>{" "}
             From elegant websites to
            community-driven tech ecosystems, I build with empathy, clarity, and
            purpose.
          </p>
        </div>

        {/* Role Display */}
        <div className="mb-8 lg:mb-10 h-16 flex items-center justify-center">
          <div className="glass-card bg-gradient-to-r from-white/10 to-white/5 border border-cyan-500/30 rounded-xl px-6 py-3 backdrop-blur-md">
            <h3 className="text-lg lg:text-xl xl:text-2xl font-bold">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {displayText}
              </span>
              <span className="ml-1 text-cyan-400 animate-pulse text-xl">
                |
              </span>
            </h3>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-5 flex-wrap justify-center mb-8">
          <button
            onClick={scrollToProjects}
            className="glass-btn bg-gradient-to-r from-cyan-500/30 to-blue-500/30 backdrop-blur-md border border-cyan-400/40 text-white px-7 py-3 rounded-xl font-semibold flex items-center gap-3 hover:scale-105 hover:from-cyan-500/40 hover:to-blue-500/40 transition-all duration-300 shadow-lg"
          >
            <span>🚀</span>
            View My Projects
            <FaArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={scrollToContact}
            className="glass-btn bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md border border-green-400/40 text-green-300 px-7 py-3 rounded-xl font-semibold flex items-center gap-3 hover:scale-105 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300"
          >
            <span>💼</span>
            Hire Me
            <FaHeart className="w-4 h-4 text-red-400" />
          </button>
        </div>

        {/* Download CV */}
        <div className="mb-12">
          <a
            href="https://drive.google.com/file/d/1ewZVJPLATbvO5X0tgceWuGKgQIXSxBRX/view?usp=sharing"
            download
            className="inline-flex items-center gap-3 text-gray-300 hover:text-cyan-400 transition-colors duration-300 group text-base font-medium"
          >
            <FaDownload className="w-4 h-4 group-hover:animate-bounce" />
            <span>Download CV</span>
          </a>
        </div>

        {/* Scroll Indicator - Positioned Under Download */}
        <div className="mt-8 pb-8">
          <button
            onClick={scrollToAbout}
            className="flex flex-col items-center space-y-2 text-cyan-400/70 hover:text-cyan-400 transition-all duration-300 group animate-bounce mx-auto"
            aria-label="Scroll to about section"
          >
            <div className="flex flex-col items-center">
              <FaChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
              <FaChevronDown className="w-4 h-4 -mt-2 opacity-60 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="text-xs font-medium tracking-wide opacity-80">
              Explore
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
