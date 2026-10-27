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
 * The path from Python to robotics, shown beside the skills card. Animations are
 * paused while the card is off screen, and the visitor can pause them with the
 * button (WCAG 2.2.2: looping motion needs an on-page control).
 */
const AIJourneyCard: React.FC<{ className?: string }> = ({ className = "" }) => {
  const cardRef = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
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
      ref={cardRef}
      id="ai-journey"
      aria-labelledby="ai-journey-heading"
      className={`ai-journey rounded-3xl p-5 sm:p-8 ${animating ? "is-animating" : ""} ${className}`}
    >
      <div className="ai-journey__header">
        <div>
          <h3 id="ai-journey-heading" className="ai-journey__title">
            AI &amp; <span className="ai-journey__title-accent">Machine Learning</span>
          </h3>
          <p className="ai-journey__intro">
            The next chapter I&apos;m building towards, from Python all the way to robotics.
          </p>
        </div>
        <button
          type="button"
          className="ai-journey__toggle"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <FaPlay aria-hidden="true" /> : <FaPause aria-hidden="true" />}
          <span className="sr-only">{paused ? "Play animation" : "Pause animation"}</span>
        </button>
      </div>

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
    </section>
  );
};

export default AIJourneyCard;
