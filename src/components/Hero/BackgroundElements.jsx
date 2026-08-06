import React, { useEffect, useRef } from "react";
import {
  SPACING_TIERS,
  Spring,
  buildGrid,
  buildStyles,
  drawField,
  drawLabels,
  paletteFor,
  spacingTierFor,
} from "./heroSurface";

const readTheme = () =>
  document.documentElement.getAttribute("data-theme") ||
  document.body.getAttribute("data-theme") ||
  "dark";

/**
 * Ambient hero background: blurred gradient blobs (CSS) layered under a
 * canvas dot-field that ripples on its own and parts around the cursor.
 *
 * Three springs at different stiffnesses drive the parallax so the blob
 * layer, the gradient hotspot and the dot field all lag the pointer by
 * different amounts. The loop is paused whenever the hero scrolls out of
 * view or the tab is hidden, and reduced-motion users get one static frame.
 */
const BackgroundElements = React.memo(function BackgroundElements() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const fieldRef = useRef(null);
  const gradientRef = useRef(null);
  const pulseRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const field = fieldRef.current;
    const gradient = gradientRef.current;
    const pulse = pulseRef.current;
    if (!root || !canvas || !field || !gradient || !pulse) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      rectLeft: 0,
      rectTop: 0,
      rectWidth: 1,
      rectHeight: 1,
      targetX: 0.62,
      targetY: 0.38,
      pointerActive: false,
      restTimer: 0,
      grid: [],
      labels: [],
      lastSpawn: -10,
      avoid: null,
      theme: readTheme(),
      palette: paletteFor(readTheme()),
      styles: buildStyles(paletteFor(readTheme())),
      washCache: { key: -1, gradient: null },
      tier: 0,
      drawCost: 0,
      slowFrames: 0,
      lastTime: 0,
      startTime: 0,
      raf: 0,
      running: false,
      visible: !document.hidden,
      intersecting: true,
    };

    const springs = {
      slowX: new Spring({ stiffness: 70, damping: 18, mass: 1.4, initial: 0.62 }),
      slowY: new Spring({ stiffness: 70, damping: 18, mass: 1.4, initial: 0.38 }),
      medX: new Spring({ stiffness: 110, damping: 19, mass: 1, initial: 0.62 }),
      medY: new Spring({ stiffness: 110, damping: 19, mass: 1, initial: 0.38 }),
      fastX: new Spring({ stiffness: 150, damping: 20, mass: 0.9, initial: 0.62 }),
      fastY: new Spring({ stiffness: 150, damping: 20, mass: 0.9, initial: 0.38 }),
    };

    let resizeRaf = 0;
    let rectRaf = 0;

    // Box occupied by the headline column and profile card, in canvas
    // coordinates. Labels dropped inside it would be painted under the
    // z-10 content and never seen.
    const measureContent = (rootRect) => {
      const content = root.parentElement?.querySelector(":scope > div.container > div");
      if (!content) return null;
      const box = content.getBoundingClientRect();
      const PAD = 24;
      return {
        left: box.left - rootRect.left - PAD,
        right: box.right - rootRect.left + PAD,
        top: box.top - rootRect.top - PAD,
        bottom: box.bottom - rootRect.top + PAD,
      };
    };

    const measure = () => {
      rectRaf = 0;
      const rect = root.getBoundingClientRect();
      state.rectLeft = rect.left;
      state.rectTop = rect.top;
      state.rectWidth = rect.width || 1;
      state.rectHeight = rect.height || 1;
    };

    const queueMeasure = () => {
      if (!rectRaf) rectRaf = window.requestAnimationFrame(measure);
    };

    const resize = () => {
      resizeRaf = 0;
      const rect = root.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      // Dots are 1–2px and soft; a full retina backing store quadruples the
      // pixels filled for no visible gain, so the canvas is capped at 1.5×.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const changed = width !== state.width || height !== state.height || dpr !== state.dpr;

      state.width = width;
      state.height = height;
      state.dpr = dpr;
      state.rectLeft = rect.left;
      state.rectTop = rect.top;
      state.rectWidth = rect.width || 1;
      state.rectHeight = rect.height || 1;
      state.avoid = measureContent(rect);

      if (!changed) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.tier = spacingTierFor(width);
      state.grid = buildGrid(width, height, SPACING_TIERS[state.tier]);
      state.washCache.key = -1;
      // Live labels were placed against the old bounds — drop them rather
      // than let one sit half off-screen.
      state.labels.length = 0;
    };

    const queueResize = () => {
      if (!resizeRaf) resizeRaf = window.requestAnimationFrame(resize);
    };

    const paintStatic = () => {
      drawField(ctx, {
        t: 0,
        width: state.width,
        height: state.height,
        grid: state.grid,
        pointerX: 0.62,
        pointerY: 0.38,
        palette: state.palette,
        styles: state.styles,
        washCache: state.washCache,
      });
    };

    /**
     * Steps the grid down a spacing tier when frames are consistently
     * expensive, so a weaker GPU/CPU gets a sparser field rather than a
     * juddery one.
     */
    const considerDegrade = (cost) => {
      state.drawCost = state.drawCost ? state.drawCost * 0.9 + cost * 0.1 : cost;
      if (state.drawCost > 9 && state.tier < SPACING_TIERS.length - 1) {
        state.slowFrames += 1;
        if (state.slowFrames > 45) {
          state.tier += 1;
          state.grid = buildGrid(state.width, state.height, SPACING_TIERS[state.tier]);
          state.slowFrames = 0;
          state.drawCost = 0;
        }
      } else if (state.slowFrames > 0) {
        state.slowFrames -= 1;
      }
    };

    const frame = (now) => {
      if (!state.running) {
        state.raf = 0;
        return;
      }
      if (!state.lastTime) {
        state.lastTime = now;
        state.startTime = now;
      }
      const dt = Math.min((now - state.lastTime) / 1000, 0.04);
      state.lastTime = now;
      const t = (now - state.startTime) / 1000;

      // With no pointer, the focus drifts on a slow lissajous so the field
      // never sits still.
      if (!state.pointerActive) {
        state.targetX = 0.62 + 0.1 * Math.cos(0.2 * t);
        state.targetY = 0.38 + 0.08 * Math.sin(0.22 * t);
      }

      springs.slowX.setTarget(state.targetX);
      springs.slowY.setTarget(state.targetY);
      springs.medX.setTarget(state.targetX);
      springs.medY.setTarget(state.targetY);
      springs.fastX.setTarget(state.targetX);
      springs.fastY.setTarget(state.targetY);

      const slowX = springs.slowX.update(dt);
      const slowY = springs.slowY.update(dt);
      const medX = springs.medX.update(dt);
      const medY = springs.medY.update(dt);
      const fastX = springs.fastX.update(dt);
      const fastY = springs.fastY.update(dt);

      field.style.transform = `translate3d(${-34 + 68 * slowX}px, ${-24 + 48 * slowY}px, 0) rotate(${
        -8 + 16 * slowX
      }deg)`;
      gradient.style.setProperty("--x", `${22 + 56 * fastX}%`);
      gradient.style.setProperty("--y", `${26 + 48 * fastY}%`);
      pulse.style.left = `${22 + 56 * slowX}%`;
      pulse.style.top = `${30 + 40 * slowY}%`;

      const drawStart = performance.now();
      drawField(ctx, {
        t,
        width: state.width,
        height: state.height,
        grid: state.grid,
        pointerX: medX,
        pointerY: medY,
        palette: state.palette,
        styles: state.styles,
        washCache: state.washCache,
      });
      considerDegrade(performance.now() - drawStart);

      // Narrow viewports have no room for captions beside the headline.
      if (state.width >= 768) {
        state.lastSpawn = drawLabels(ctx, {
          t,
          width: state.width,
          height: state.height,
          labels: state.labels,
          lastSpawn: state.lastSpawn,
          theme: state.theme,
          avoid: state.avoid,
        });
      }

      state.raf = window.requestAnimationFrame(frame);
    };

    const stop = () => {
      state.running = false;
      if (state.raf) window.cancelAnimationFrame(state.raf);
      state.raf = 0;
      state.lastTime = 0;
    };

    const sync = () => {
      if (reduceMotion) return;
      const shouldRun = state.visible && state.intersecting;
      if (shouldRun && !state.running) {
        state.running = true;
        state.raf = window.requestAnimationFrame(frame);
      } else if (!shouldRun && state.running) {
        stop();
      }
    };

    // Mouse and pen only. Touch pointers are ignored outright so the field
    // can never interfere with scrolling the hero on a phone.
    const onPointerMove = (event) => {
      if (event.pointerType === "touch") return;
      const x = (event.clientX - state.rectLeft) / state.rectWidth;
      const y = (event.clientY - state.rectTop) / state.rectHeight;
      state.targetX = Math.max(0, Math.min(1, x));
      state.targetY = Math.max(0, Math.min(1, y));
      state.pointerActive = true;
      if (state.restTimer) clearTimeout(state.restTimer);
      state.restTimer = setTimeout(() => {
        state.pointerActive = false;
        state.restTimer = 0;
      }, 2500);
    };

    const onVisibility = () => {
      state.visible = !document.hidden;
      sync();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        state.intersecting = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      { threshold: 0 },
    );
    observer.observe(root);

    const resizeObserver = new window.ResizeObserver(queueResize);
    resizeObserver.observe(root);

    const themeObserver = new MutationObserver(() => {
      state.theme = readTheme();
      state.palette = paletteFor(state.theme);
      state.styles = buildStyles(state.palette);
      state.washCache.key = -1;
      if (reduceMotion) paintStatic();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", queueMeasure, { passive: true });
    window.addEventListener("resize", queueResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    if (reduceMotion) paintStatic();
    else sync();

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", queueMeasure);
      window.removeEventListener("resize", queueResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      if (rectRaf) window.cancelAnimationFrame(rectRaf);
      if (state.restTimer) clearTimeout(state.restTimer);
    };
  }, []);

  return (
    <div ref={rootRef} className="hero-surface" aria-hidden="true">
      <div ref={fieldRef} className="hero-surface__field">
        <div ref={gradientRef} className="hero-surface__gradient" />
        <div className="hero-surface__wave" />
        <div ref={pulseRef} className="hero-surface__pulse" />
        <div className="hero-surface__drift" />
      </div>
      <canvas ref={canvasRef} className="hero-surface__canvas" />
    </div>
  );
});

export default BackgroundElements;
