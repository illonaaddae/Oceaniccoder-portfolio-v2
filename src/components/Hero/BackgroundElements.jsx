import React from "react";
import TechConstellation from "./TechConstellation";

/**
 * Hero background: a static gradient wash under a CSS-only tech constellation.
 *
 * This used to be a canvas dot-field driven by a requestAnimationFrame loop
 * and six springs, layered under five blurred gradient blobs. Per frame it
 * wrote `left`/`top` on one blob (layout properties, which are not
 * composited), wrote `--x`/`--y` onto a `filter: blur(70px)` layer — forcing a
 * re-blur of a 95vw x 150vh surface — and animated that same layer with
 * `scale(1.06)`, all on top of five `will-change: transform` layers at that
 * size. That is what made the hero stutter on phones.
 *
 * It was then a wash plus an oversized wordmark, which cost one paint but sat
 * right behind the headline and the CTAs and competed with them. The wordmark
 * is gone; the constellation took its place. No canvas, no rAF, no springs, no
 * blur filters — one paint, then GPU compositing of a dozen small glyphs.
 *
 * Everything else in the hero — the markup, the layout, the type, the role
 * animation, the portrait — is untouched.
 */
const BackgroundElements = React.memo(function BackgroundElements() {
  return (
    <div className="hero-surface" aria-hidden="true">
      <div className="hero-surface__wash" />
      <TechConstellation />
    </div>
  );
});

export default BackgroundElements;
