import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaArrowRight,
  FaDownload,
  FaHeart,
  FaChevronDown,
  FaRocket,
  FaBriefcase,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { usePortfolioData } from "../hooks/usePortfolioData";

const HeroSection = () => {
  const [currentRole, setCurrentRole] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const imgRef = useRef(null);

  // Get about data for CV URL
  const { about } = usePortfolioData();

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
      "WordPress & Web Experience Designer",
      "UI/UX Thinker",
      "Continuous Learner",
      "Oceaniccoder",
    ],
    [],
  );

  useEffect(() => {
    const currentString = roles[currentRole];
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseTime = isDeleting ? 500 : 2000;

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (!isDeleting && displayText.length < currentString.length) {
        setDisplayText(currentString.substring(0, displayText.length + 1));
      } else if (!isDeleting && displayText.length === currentString.length) {
        pauseTimeoutRef.current = setTimeout(
          () => setIsDeleting(true),
          pauseTime,
        );
      } else if (isDeleting && displayText.length > 0) {
        setDisplayText(currentString.substring(0, displayText.length - 1));
      } else if (isDeleting && displayText.length === 0) {
        setIsDeleting(false);
        setCurrentRole((prev) => (prev + 1) % roles.length);
      }
    }, typingSpeed);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [displayText, isDeleting, currentRole, roles]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Check if image is already loaded/cached on mount to prevent flash
  useEffect(() => {
    // Use Appwrite Storage URL for profile image
    const imagePath =
      "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444ceb001c1eda1331/view?project=6943431e00253c8f9883";

    // First, check if image is already cached using a new Image object
    const img = new Image();
    img.src = imagePath;

    let checkTimeout = null;

    // Also check the actual img element once it's mounted (with a small delay)
    const checkImgElement = () => {
      if (imgRef.current) {
        const element = imgRef.current;
        if (element.complete && element.naturalWidth > 0) {
          // Image is already loaded in the element - show immediately
          setProfileLoaded(true);
          setImageReady(true);
          return true;
        }
      }
      return false;
    };

    if (img.complete || img.naturalWidth > 0) {
      // Image is already cached/loaded - show immediately
      setProfileLoaded(true);
      setImageReady(true);
    } else {
      // Check the actual element after a short delay (to allow DOM to render)
      checkTimeout = setTimeout(() => {
        if (!checkImgElement()) {
          // Image not cached, will be handled by onLoad
        }
      }, 50);

      // Wait for image to load if not cached
      img.onload = () => {
        setProfileLoaded(true);
        // Small delay to ensure smooth transition
        requestAnimationFrame(() => {
          setImageReady(true);
        });
      };
      img.onerror = () => {
        // Fallback: still show the image even if preload failed
        setProfileLoaded(true);
        setImageReady(true);
      };
    }

    return () => {
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
      img.onload = null;
      img.onerror = null;
    };
  }, []);

  const scrollToProjects = useCallback(() => {
    navigate("/projects");
  }, [navigate]);

  const scrollToContact = useCallback(() => {
    navigate("/contact");
  }, [navigate]);

  const scrollToSkills = useCallback(() => {
    try {
      // Clear any existing scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      const el = document.getElementById("skills");
      const nav = document.querySelector("nav");
      const navHeight = (nav && nav.offsetHeight) || 80;

      const scrollInto = (target) => {
        const rect = target.getBoundingClientRect();
        const top = rect.top + window.scrollY - navHeight - 12;
        window.scrollTo({ top, left: 0, behavior: "smooth" });
      };

      if (el) {
        scrollInto(el);
        return;
      }

      // If skills section isn't on this route, navigate to home then scroll
      navigate("/");
      scrollTimeoutRef.current = setTimeout(() => {
        const el2 = document.getElementById("skills");
        if (el2) scrollInto(el2);
        scrollTimeoutRef.current = null;
      }, 350);
    } catch (e) {
      // Fallback: navigate to home page
      navigate("/");
    }
  }, [navigate]);

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

      <div className="container mx-auto px-6 relative z-10 flex flex-col min-h-screen justify-center">
        {/* Main Grid - Side by Side on Large Screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-7xl mx-auto w-full">
          {/* Left Column - Content (on large screens) */}
          <div className="text-center lg:text-left order-2 lg:order-1 space-y-6 lg:space-y-8">
            {/* Name */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-heading font-bold leading-tight tracking-tight">
              <span className="text-cyan-600 dark:text-cyan-400 font-bold tracking-wide">
                Illona{" "}
              </span>
              <span className="text-gray-700 dark:text-gray-100">Addae</span>
            </h1>

            {/* Oceaniccoder */}
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-display font-bold leading-tight tracking-wide">
              <span className="text-gray-700 dark:text-gray-100">Oceanic</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold tracking-wide">
                coder
              </span>
            </h2>

            {/* Tagline */}
            <p className="text-base sm:text-lg lg:text-xl max-w-2xl lg:max-w-none leading-relaxed text-gray-200 dark:text-gray-300 font-light">
              <span className="text-white font-medium">
                "In a world of can'ts, she whispers I can, and in doing so, she
                became an unstoppable force."
              </span>
            </p>

            {/* Role Display */}
            <div className="flex justify-center lg:justify-start">
              <div className="glass-card bg-gradient-to-r from-white/10 to-white/5 border border-teal-600/25 rounded-xl px-6 py-3 backdrop-blur-md inline-block">
                <h3 className="text-lg lg:text-xl font-bold">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                    {displayText}
                  </span>
                  <span className="ml-1 text-teal-500 dark:text-teal-300 animate-pulse text-xl">
                    |
                  </span>
                </h3>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-5 flex-wrap justify-center lg:justify-start">
              <button
                onClick={scrollToProjects}
                className="glass-btn bg-gradient-to-r from-teal-600/25 to-blue-600/25 backdrop-blur-md border border-teal-600/35 text-white px-7 py-3 rounded-xl font-semibold flex items-center gap-3 hover:scale-105 hover:from-teal-600/35 hover:to-blue-600/35 transition-all duration-300 shadow-lg"
                aria-label="Navigate to projects section"
              >
                View My Projects
                <FaArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={scrollToContact}
                className="glass-btn bg-gradient-to-r from-emerald-700/20 to-emerald-600/20 backdrop-blur-md border border-emerald-600/35 text-emerald-100 px-7 py-3 rounded-xl font-semibold flex items-center gap-3 hover:scale-105 hover:from-emerald-700/30 hover:to-emerald-600/30 transition-all duration-300"
                aria-label="Navigate to contact section"
              >
                <FaBriefcase className="w-4 h-4" />
                Hire Me
              </button>
            </div>

            {/* Download CV */}
            <div>
              <a
                href={
                  about?.resumeUrl ||
                  "https://drive.google.com/file/d/1ewZVJPLATbvO5X0tgceWuGKgQIXSxBRX/view?usp=sharing"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 text-gray-300 hover:text-teal-400 transition-colors duration-300 group text-base font-medium"
                aria-label="Download CV resume"
              >
                <FaDownload className="w-4 h-4 group-hover:animate-bounce" />
                <span>Download CV</span>
              </a>
            </div>
          </div>

          {/* Right Column - Profile Image (on large screens) */}
          <div className="flex justify-center lg:justify-start order-1 lg:order-2">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-teal-600/15 to-blue-600/15 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>

              <div className="relative">
                <div className="w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[26rem] lg:h-[26rem] xl:w-[28rem] xl:h-[28rem] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 group-hover:scale-105 transition-transform duration-300">
                  <img
                    ref={imgRef}
                    src="https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444ceb001c1eda1331/view?project=6943431e00253c8f9883"
                    alt="Illona Addae - Professional Developer Portrait"
                    className={`w-full h-full object-cover object-center group-hover:scale-110 transition-all duration-300 hero-img ${
                      imageReady ? "loaded" : ""
                    }`}
                    onLoad={() => {
                      if (!profileLoaded) {
                        setProfileLoaded(true);
                      }
                      if (!imageReady) {
                        requestAnimationFrame(() => {
                          setImageReady(true);
                        });
                      }
                    }}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    width="1200"
                    height="1200"
                    onError={(e) => {
                      setProfileLoaded(true);
                      setImageReady(true);
                    }}
                    style={{
                      willChange: imageReady ? "transform" : "opacity",
                      transform: "translateZ(0)",
                      WebkitTransform: "translateZ(0)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      opacity: imageReady ? 1 : 0,
                      transition: imageReady
                        ? "opacity 0ms ease-out, transform 300ms ease-out"
                        : "opacity 300ms ease-out, transform 300ms ease-out",
                    }}
                  />
                </div>
              </div>

              {/* Status Badge */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                <div className="glass-card bg-gradient-to-r from-emerald-700/15 to-emerald-600/15 backdrop-blur-md border border-emerald-600/25 rounded-xl px-5 py-2 shadow-xl">
                  <span className="text-emerald-900 dark:text-emerald-50 text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    Available for Hire
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator - Outside Grid, Centered */}
        <div className="mt-12 lg:mt-16 pb-8 flex justify-center">
          <button
            onClick={scrollToSkills}
            className="flex flex-col items-center space-y-2 text-teal-500/70 dark:text-teal-400/70 hover:text-teal-500 dark:hover:text-teal-400 transition-all duration-300 group animate-bounce"
            aria-label="Explore skills section"
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
