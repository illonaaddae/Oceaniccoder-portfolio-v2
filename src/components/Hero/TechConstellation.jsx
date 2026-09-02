import React from "react";
import { TECH_CONSTELLATION } from "./heroTech";

/**
 * Ambient tech glyphs behind the hero copy.
 *
 * This replaced an oversized "oceaniccoder" wordmark that ran directly behind
 * the headline and the CTAs, where it read as a second block of type
 * competing with the first. A sparse field of faded tech marks, each on its
 * own long loop, gives the same sense of depth without ever asking to be read.
 *
 * The motion is entirely CSS: every glyph animates `opacity` and `transform`
 * only, both composited, so the field costs nothing on the main thread. There
 * is no state, no timer and no requestAnimationFrame here on purpose — the
 * canvas-and-rAF version of this surface is what used to make the hero stutter
 * on phones.
 */
const TechConstellation = React.memo(function TechConstellation() {
  return (
    <div className="hero-tech" aria-hidden="true">
      {TECH_CONSTELLATION.map(({ name, Icon, top, left, size, duration, delay, drift }) => (
        <span
          key={name}
          className="hero-tech__item"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            animationDuration: `${duration}s`,
            // Negative, so the glyph starts part-way through its loop rather
            // than holding at opacity 0 for its first seconds on screen.
            animationDelay: `-${delay}s`,
            "--tech-size": `${size}px`,
            "--tech-drift": `${drift}px`,
          }}
        >
          <Icon />
        </span>
      ))}
    </div>
  );
});

export default TechConstellation;
