import React, { useEffect, useRef, useState } from "react";
import AIJourneyScene from "./AIJourneyScene";

export const JOURNEY_STEPS = [
  "Python",
  "Data Engineering",
  "Data Science",
  "Machine Learning",
  "Applied AI",
  "Robotics",
] as const;

/**
 * Home-page section showing the path from Python to robotics. Animations only
 * run while the section is on screen, so it costs nothing while the visitor is
 * reading the hero above it.
 */
const AIJourneySection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setOnScreen(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: "100px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="ai-journey"
      aria-labelledby="ai-journey-heading"
      className={`ai-journey py-20 relative scroll-mt-24 sm:scroll-mt-28 ${onScreen ? "is-on-screen" : ""}`}
      style={{
        background:
          "linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      <div className="container mx-auto px-6 relative z-10 max-w-6xl">
        <div className="text-center mb-10">
          <h2 id="ai-journey-heading" className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gray-700 dark:text-gray-100">AI &amp;</span>{" "}
            <span className="text-oceanic-600 dark:text-oceanic-500">Machine Learning</span>
          </h2>
          <p className="text-lg md:text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-gray-200">
            The next chapter I&apos;m building towards: growing from Python into data engineering,
            data science, machine learning, applied AI and robotics.
          </p>
        </div>

        <div className="ai-journey__card rounded-3xl p-4 sm:p-8">
          <AIJourneyScene />
          <ol className="ai-journey__path" aria-label="My learning path">
            {JOURNEY_STEPS.map((step, i) => (
              <li
                key={step}
                className="ai-journey__step"
                style={{ "--step": i } as React.CSSProperties}
              >
                <span className="ai-journey__chip">{step}</span>
                {i < JOURNEY_STEPS.length - 1 && (
                  <span className="ai-journey__arrow" aria-hidden="true">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default AIJourneySection;
