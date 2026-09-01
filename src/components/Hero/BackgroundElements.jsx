import React from "react";

/**
 * Hero background: a single static gradient wash.
 *
 * This used to be a canvas dot-field driven by a requestAnimationFrame loop
 * and six springs, layered under five blurred gradient blobs. Per frame it
 * wrote `left`/`top` on one blob (layout properties, which are not
 * composited), wrote `--x`/`--y` onto a `filter: blur(70px)` layer — forcing a
 * re-blur of a 95vw x 150vh surface — and animated that same layer with
 * `scale(1.06)`, all on top of five `will-change: transform` layers at that
 * size. That is what made the hero stutter on phones.
 *
 * Now: a gradient wash and the wordmark set oversized along the base. No
 * canvas, no rAF, no springs, no blur filters, no promoted layers, no
 * animation. One paint, then nothing.
 *
 * Everything else in the hero — the markup, the layout, the type, the role
 * animation, the portrait — is untouched.
 */
const BackgroundElements = React.memo(function BackgroundElements() {
  return (
    <div className="hero-surface" aria-hidden="true">
      <div className="hero-surface__wash" />
      <p className="hero-surface__wordmark">oceaniccoder</p>
    </div>
  );
});

export default BackgroundElements;
