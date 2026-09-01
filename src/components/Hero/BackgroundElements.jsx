import React from "react";

/**
 * Hero background: "deep water" — light falling through water seen from below.
 *
 * One soft glow overhead, depth downward, and the wordmark set oversized
 * behind everything so it bleeds off the bottom edge. Gradients and type only:
 * two earlier attempts put strokes in here — contour curves, then a horizon
 * rule — and both read as stray marks across the headline and the portrait.
 *
 * The surface previously ran a canvas dot-field on a rAF loop plus five blurred
 * blobs — per frame it wrote layout-triggering left/top and re-blurred a
 * 95vw × 150vh gradient, which is what made the hero stutter on phones.
 *
 * No canvas, no rAF, no blur filters, no promoted layers, no animation. One
 * paint, then nothing.
 */
const BackgroundElements = React.memo(function BackgroundElements() {
  return (
    <div className="hero-surface" aria-hidden="true">
      <div className="hero-surface__depth" />
      <p className="hero-surface__wordmark">oceaniccoder</p>
    </div>
  );
});

export default BackgroundElements;
