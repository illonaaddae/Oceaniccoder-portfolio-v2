import React, { useEffect, useState } from "react";

export default function Splash({ exiting = false }) {
  const [progress, setProgress] = useState(0);
  const [typed, setTyped] = useState("");
  const fullText = "Oceaniccoder";
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const startDelay = 80;
    const t = setTimeout(() => setProgress(100), startDelay);

    // Slow down typing a bit so users can read the welcome message
    const totalTypingMs = 4000; // ms
    const chars = fullText.length;
    const intervalMs = Math.max(40, Math.floor(totalTypingMs / chars));
    let idx = 0;
    const typeTimer = setInterval(() => {
      idx += 1;
      setTyped(fullText.substring(0, idx));
      if (idx >= chars) {
        clearInterval(typeTimer);
        // typing finished — show welcome for a bit longer so users notice
        setShowWelcome(true);
        setTimeout(() => setShowWelcome(false), 2400);
      }
    }, intervalMs);

    return () => {
      clearTimeout(t);
      clearInterval(typeTimer);
    };
  }, []);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const containerClass = `splash-root fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black transition-all duration-500 ease-in-out ${
    exiting ? "opacity-0 scale-95 pointer-events-none" : "opacity-100"
  }`;

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Animated outer ring */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 rounded-full border-4 border-cyan-400/30 loader-ring loader-ring-outer"></div>
          )}
          
          {/* Animated middle ring */}
          {!prefersReducedMotion && (
            <div className="absolute inset-2 rounded-full border-3 border-blue-400/40 loader-ring loader-ring-middle"></div>
          )}
          
          {/* Animated inner ring */}
          {!prefersReducedMotion && (
            <div className="absolute inset-6 rounded-full border-2 border-green-400/50 loader-ring loader-ring-inner"></div>
          )}

          {/* Glowing pulse background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-20 blur-lg loader-pulse"></div>

          {/* Logo container */}
          <div className="absolute inset-4 rounded-full flex items-center justify-center bg-white dark:bg-black shadow-2xl z-10">
            <img
              src="/images/logo/oceanic-logo.png"
              alt="Oceaniccoder Logo"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-24 h-24 object-contain"
              onError={(e) => {
                try {
                  e.target.style.display = "none";
                  const el =
                    e.target.parentNode.querySelector(".splash-fallback");
                  if (el) el.style.display = "flex";
                } catch (err) {
                  /* swallow */
                }
              }}
            />

            <div
              className="splash-fallback hidden w-24 h-24 rounded-full bg-cyan-50 dark:bg-gray-900 text-cyan-500 dark:text-cyan-300 font-bold text-2xl items-center justify-center"
              aria-hidden
            >
              O
            </div>
          </div>

          <svg
            className="absolute bottom-0 left-0 right-0 h-6"
            viewBox="0 0 120 20"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0 10 C 20 0, 40 20, 60 10 C 80 0,100 20,120 10 L120 20 L0 20 Z"
              fill="#00b5d8"
              opacity="0.06"
            />
          </svg>
        </div>

        <div className="text-center">
          <div className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-green-600 bg-clip-text text-transparent inline-flex items-center">
              {typed}
              <span className="ml-1 text-cyan-400" aria-hidden>
                {typed.length < fullText.length ? "|" : ""}
              </span>
            </span>
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Crafting delightful experiences, one line of code at a time
          </div>

          {/* Welcome message shown after typing completes, below the subtitle */}
          <div aria-hidden className="mt-4">
            <div
              className={`text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-200 transition-all duration-240 ease-in-out transform ${
                showWelcome
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-2"
              }`}
            >
              <span className="mr-2">Welcome</span>
              <span aria-hidden className="text-2xl">
                😊
              </span>
            </div>
          </div>
        </div>

        <div className="w-56 mt-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500"
              style={{
                width: `${progress}%`,
                // match the slower typing duration so progress feels natural
                transition: "width 4.2s ease-in-out",
              }}
            />
          </div>
        </div>

        <div className="text-xs text-gray-400">
          Preparing a smoother, faster experience…
        </div>
      </div>
    </div>
  );
}
