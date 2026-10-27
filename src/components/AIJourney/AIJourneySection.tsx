import React, { useEffect, useRef, useState } from "react";
import { FaPause, FaPlay } from "react-icons/fa";
import AIJourneyScene from "./AIJourneyScene";

const JOURNEY_STEPS = [
  "Python",
  "Data Engineering",
  "Data Science",
  "Machine Learning",
  "Applied AI",
  "Robotics",
] as const;

/**
 * Home-page section showing the path from Python to robotics. Animations are
 * paused while the section is off screen, and the visitor can pause them with
 * the button on the card (WCAG 2.2.2: looping motion needs an on-page control).
 */
const AIJourneySection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [paused, setPaused] = useState(false);

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

  const animating = onScreen && !paused;

  return (
    <section
      ref={sectionRef}
      id="ai-journey"
      aria-labelledby="ai-journey-heading"
      className={`ai-journey py-20 relative ${animating ? "is-animating" : ""}`}
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
            The next chapter I&apos;m building towards, from Python all the way to robotics.
          </p>
        </div>

        <div className="ai-journey__card relative rounded-3xl p-4 pt-14 sm:p-8">
          <button
            type="button"
            className="ai-journey__toggle"
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <FaPlay aria-hidden="true" /> : <FaPause aria-hidden="true" />}
            <span className="sr-only">{paused ? "Play animation" : "Pause animation"}</span>
          </button>
          <AIJourneyScene />
          {/* role="list" keeps list semantics in Safari, which drops them when list-style is none. */}
          {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
          <ol className="ai-journey__path" role="list" aria-label="My learning path">
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
