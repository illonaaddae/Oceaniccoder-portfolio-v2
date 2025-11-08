import React, { useEffect, useState } from "react";

const Splash = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start the progress animation almost immediately so it completes
    // roughly in time with the app's splash timeout (3.2s in App.js).
    const t = setTimeout(() => setProgress(100), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-40 h-40">
          {/* Glowing background ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-20 animate-pulse blur-lg"></div>

          {/* Rotating logo container */}
          <div className="absolute inset-4 rounded-full flex items-center justify-center bg-white dark:bg-black shadow-2xl">
            <img
              src="/images/logo/oceanic-logo.png"
              alt="Oceaniccoder Logo"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-24 h-24 object-contain animate-[spin_12s_linear_infinite]"
              style={{ animationTimingFunction: "cubic-bezier(.2,.9,.3,1)" }}
              onError={(e) => {
                // if the image fails to load (CI/path mismatch), hide it and
                // reveal a simple text fallback so the splash remains visible
                try {
                  e.target.style.display = "none";
                  const el =
                    e.target.parentNode.querySelector(".splash-fallback");
                  if (el) el.style.display = "flex";
                } catch (err) {}
              }}
            />
            <div
              className="splash-fallback w-24 h-24 rounded-full bg-cyan-50 dark:bg-gray-900 text-cyan-500 dark:text-cyan-300 font-bold text-2xl items-center justify-center hidden"
              aria-hidden
            >
              O
            </div>
          </div>

          {/* Subtle ripple SVG */}
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
            Oceaniccoder
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Crafting delightful experiences — one line of code at a time
          </div>
        </div>

        <div className="w-48 mt-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500"
              style={{
                width: `${progress}%`,
                // match the visual duration to the splash timeout in App.js (~3.2s)
                transition: "width 3.1s ease-in-out",
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
};

export default Splash;
