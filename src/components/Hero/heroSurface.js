/**
 * Hero surface field — pure math + canvas painting, no React.
 *
 * A grid of dots is displaced every frame by the sum of four sine waves
 * (one radial ripple + two axis waves + one diagonal), then pushed away from
 * the pointer by a gaussian falloff. Colour and size are driven by how far a
 * dot has been displaced, so the field reads as a slow-moving ocean swell.
 *
 * Kept framework-free so it can be unit-tested and so the render loop never
 * allocates: `buildGrid` runs once per resize, `drawField` mutates nothing.
 */

/** Critically-ish damped spring, integrated with semi-implicit Euler. */
export class Spring {
  constructor({ stiffness, damping, mass, initial }) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
    this.value = initial;
    this.target = initial;
    this.velocity = 0;
  }

  setTarget(value) {
    this.target = value;
  }

  update(dt) {
    const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
    this.velocity += (force / this.mass) * dt;
    this.value += this.velocity * dt;
    return this.value;
  }
}

/**
 * Dots displace by at most ~28px vertically, so the grid only needs a
 * sliver of overscan. The original 120px bleed meant painting thousands of
 * dots that could never appear on screen.
 */
export const GRID_BLEED = 32;

const WASH_RADIUS = 420;

/* ── Fast sine ───────────────────────────────────────────────────
   Five sine terms per dot across ~25k dots is ~125k Math.sin calls a
   frame. A 4096-entry table is accurate to ~1e-3 rad here, which is
   far below anything visible in a 1px dot, and roughly an order of
   magnitude cheaper.
   ──────────────────────────────────────────────────────────────── */
const TWO_PI = Math.PI * 2;
const LUT_SIZE = 4096;
const LUT_MASK = LUT_SIZE - 1;
const LUT_SCALE = LUT_SIZE / TWO_PI;
const SIN_LUT = new Float32Array(LUT_SIZE);
for (let i = 0; i < LUT_SIZE; i++) SIN_LUT[i] = Math.sin((i / LUT_SIZE) * TWO_PI);

/** Negative indices wrap correctly: (-1 & 4095) === 4095. */
function fastSin(x) {
  return SIN_LUT[(x * LUT_SCALE) & LUT_MASK];
}

/**
 * Dot spacing tiers. The renderer starts at the tier suited to the
 * viewport and can step down a tier if frames come in slow.
 */
export const SPACING_TIERS = [11, 13, 16, 20];

export function spacingTierFor(width) {
  if (width < 768) return 2;
  if (width < 1280) return 1;
  return 0;
}

/**
 * Grid is stored as one flat Float32Array (x, y pairs) rather than an
 * array of objects — no pointer chasing and no GC pressure in the loop.
 */
export function buildGrid(width, height, spacing) {
  const maxX = width + GRID_BLEED;
  const maxY = height + GRID_BLEED;
  const cols = Math.floor((maxX + GRID_BLEED) / spacing) + 1;
  const rows = Math.floor((maxY + GRID_BLEED) / spacing) + 1;
  const points = new Float32Array(cols * rows * 2);
  let i = 0;
  for (let y = -GRID_BLEED; y <= maxY; y += spacing) {
    for (let x = -GRID_BLEED; x <= maxX; x += spacing) {
      points[i++] = x;
      points[i++] = y;
    }
  }
  return points.subarray(0, i);
}

/**
 * Dot colours ramp from `lo` (at rest) to `hi` (fully displaced).
 * Dark theme lifts brightness so dots read on the navy hero gradient; light
 * theme uses the AA-safe deep teals so the field stays subtle on white.
 */
const PALETTES = {
  dark: {
    lo: [26, 110, 140],
    hi: [141, 215, 231],
    alphaScale: 1.3,
    wash: ["rgba(38, 169, 197, 0.05)", "rgba(99, 102, 241, 0.028)"],
  },
  light: {
    lo: [10, 110, 125],
    hi: [8, 88, 102],
    alphaScale: 1.05,
    wash: ["rgba(10, 110, 125, 0.045)", "rgba(38, 169, 197, 0.025)"],
  },
};

export function paletteFor(theme) {
  return theme === "light" ? PALETTES.light : PALETTES.dark;
}

/* ── Fill-style table ────────────────────────────────────────────
   Building `rgba(...)` per dot meant ~25k string allocations plus
   ~25k CSS colour parses every frame. Colour and alpha are quantised
   instead and looked up from a table built once per palette, so the
   loop assigns the *same string reference* over and over — which the
   canvas implementation caches.
   ──────────────────────────────────────────────────────────────── */
const COLOR_STEPS = 12;
const ALPHA_STEPS = 16;
const MAX_ALPHA = 0.8;

export function buildStyles(palette) {
  const { lo, hi } = palette;
  const table = new Array(COLOR_STEPS * ALPHA_STEPS);
  for (let c = 0; c < COLOR_STEPS; c++) {
    const mix = c / (COLOR_STEPS - 1);
    const r = Math.round(lo[0] + (hi[0] - lo[0]) * mix);
    const g = Math.round(lo[1] + (hi[1] - lo[1]) * mix);
    const b = Math.round(lo[2] + (hi[2] - lo[2]) * mix);
    for (let a = 0; a < ALPHA_STEPS; a++) {
      const alpha = (((a + 1) / ALPHA_STEPS) * MAX_ALPHA).toFixed(3);
      table[c * ALPHA_STEPS + a] = `rgba(${r},${g},${b},${alpha})`;
    }
  }
  return table;
}

/**
 * Paints one frame.
 *
 * The field is masked to an ellipse offset to the right of the hero so the
 * headline column stays clean — dots outside it are rejected before any
 * trig runs, which is what keeps a ~20k-point grid affordable.
 */
export function drawField(ctx, opts) {
  const { t, width, height, grid, pointerX, pointerY, palette, styles } = opts;

  ctx.clearRect(0, 0, width, height);

  const px = pointerX * width;
  const py = pointerY * height;

  // Ripple origin and pointer-repulsion radius.
  const originX = 0.68 * width;
  const originY = 0.42 * height;
  const repelRadius = Math.min(width, height) * 0.32;
  const repelRadiusSq = repelRadius * repelRadius;
  // Past this distance the gaussian is < 1e-3, so the sqrt/exp are skipped.
  const repelCutoffSq = repelRadiusSq * 4;

  // Elliptical mask — centre, radii, and the band over which dots fade out.
  // Centred and oversized so the field carries all the way across the hero
  // and only feathers off at the outer corners.
  const maskX = 0.5 * width;
  const maskY = 0.46 * height;
  const invRX = 1 / Math.max(1, 1.05 * width);
  const invRY = 1 / Math.max(1, 0.98 * height);
  const FEATHER = 0.45;
  const featherStart = 1 - FEATHER;
  const invFeather = 1 / FEATHER;

  const swell = 0.4 * fastSin(0.2 * t);
  const alphaScale = palette.alphaScale;

  // Time-dependent phases hoisted out of the loop.
  const ripplePhase = -0.3 * t;
  const wavePhaseX = 0.28 * t;
  const wavePhaseY = 0.22 * t;
  const diagPhase = 0.18 * t;

  const alphaToIndex = (ALPHA_STEPS / MAX_ALPHA) | 0;
  let lastStyle = null;

  for (let i = 0; i < grid.length; i += 2) {
    const ox = grid[i];
    const oy = grid[i + 1];

    // Cheap rejection first: anything outside the mask ellipse never gets
    // trig or colour work done on it.
    const nx = (ox - maskX) * invRX;
    const ny = (oy - maskY) * invRY;
    const radial = nx * nx + ny * ny;
    if (radial > 1) continue;
    const edgeFade = radial > featherStart ? (1 - radial) * invFeather : 1;

    const dx = ox - originX;
    const dy = oy - originY;
    const ripple = 0.42 * fastSin(0.011 * Math.sqrt(dx * dx + dy * dy) + ripplePhase);
    const waveX = 0.42 * fastSin(0.009 * ox + wavePhaseX);
    const waveY = 0.35 * fastSin(0.0095 * oy + wavePhaseY);
    const diagonal = 0.3 * fastSin((0.5 * ox + 0.4 * oy) * 0.008 + diagPhase);
    const disp = swell + ripple + waveX + waveY + diagonal;

    let x = ox + 4 * disp;
    let y = oy - 24 * disp;

    // Pointer repulsion: gaussian falloff, dots slide outward along the
    // vector from the cursor. Almost every dot is far from the cursor, so
    // the squared-distance test keeps sqrt and exp off the hot path.
    const qx = x - px;
    const qy = y - py;
    const distSq = qx * qx + qy * qy;
    let pull = 0;
    if (distSq < repelCutoffSq) {
      pull = Math.exp(-distSq / (0.55 * repelRadiusSq));
      const lift = -1.3 * pull;
      y -= 24 * lift;
      if (pull > 0.04) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.5) {
          const push = (pull * pull * 30) / dist;
          x -= qx * push;
          y -= qy * push;
        }
      }
    }

    const energy = disp - 1.3 * pull;
    const positive = energy > 0 ? energy : 0;
    const alpha =
      (0.14 + 0.16 * positive + 0.3 * pull + 0.05 * (energy < 0 ? -energy : energy)) *
      alphaScale *
      edgeFade;
    if (alpha < 0.05) continue;

    let mix = 0.32 * energy + 0.5;
    mix = mix < 0 ? 0 : mix > 1 ? 1 : mix;

    const colorIdx = (mix * (COLOR_STEPS - 1) + 0.5) | 0;
    let alphaIdx = ((alpha * alphaToIndex) | 0) - 1;
    if (alphaIdx < 0) alphaIdx = 0;
    else if (alphaIdx >= ALPHA_STEPS) alphaIdx = ALPHA_STEPS - 1;

    const style = styles[colorIdx * ALPHA_STEPS + alphaIdx];
    if (style !== lastStyle) {
      ctx.fillStyle = style;
      lastStyle = style;
    }

    const size = 1 + 0.5 * positive + 0.55 * pull;
    ctx.fillRect(x, y, size, size);
  }

  // Soft wash under the cursor so the repelled area glows rather than just
  // thinning out. The gradient object is rebuilt only when the cursor has
  // moved a noticeable amount, not every frame.
  const cache = opts.washCache;
  const key = ((px / 24) | 0) * 10000 + ((py / 24) | 0) * 4 + (palette === PALETTES.light ? 1 : 0);
  if (!cache || cache.key !== key) {
    const wash = ctx.createRadialGradient(px, py, 0, px, py, WASH_RADIUS);
    wash.addColorStop(0, palette.wash[0]);
    wash.addColorStop(0.45, palette.wash[1]);
    wash.addColorStop(1, "rgba(255, 255, 255, 0)");
    if (cache) {
      cache.key = key;
      cache.gradient = wash;
    }
    ctx.fillStyle = wash;
  } else {
    ctx.fillStyle = cache.gradient;
  }
  // Only the gradient's own footprint is blended. Filling the whole canvas
  // here meant alpha-blending every pixel of the hero on every frame, which
  // cost more than all the dots put together.
  const wx = px - WASH_RADIUS;
  const wy = py - WASH_RADIUS;
  ctx.fillRect(wx, wy, WASH_RADIUS * 2, WASH_RADIUS * 2);
}

/* ── Drifting stack labels ──────────────────────────────────────
   Small dot + caption that fades in somewhere in the field, holds,
   then fades out. Purely decorative, so they live on the canvas
   rather than in the DOM (nothing for a screen reader to read, and
   no layout cost).
   ─────────────────────────────────────────────────────────────── */

export const LABEL_TEXTS = [
  "React 19",
  "TypeScript",
  "Appwrite",
  "Azure Functions",
  "Tailwind CSS",
  "Vite",
  "Node.js",
  "Vitest",
  "GitHub Actions",
  "Paystack",
  "REST APIs",
  "CI/CD",
];

const LABEL_COLORS = {
  dark: [
    [141, 215, 231],
    [38, 169, 197],
    [129, 140, 248],
  ],
  light: [
    [10, 110, 125],
    [8, 88, 102],
    [79, 70, 229],
  ],
};

const SPAWN_INTERVAL = 1.1;
const LABEL_LIFE = 4.2;
const FADE_IN = 0.7;
const FADE_OUT = 1.2;
const MAX_LABELS = 4;

/**
 * Advances and paints the label layer. Returns the timestamp of the most
 * recent spawn so the caller can thread it into the next frame.
 */
export function drawLabels(ctx, opts) {
  const { t, width, height, labels, lastSpawn, theme } = opts;
  const colors = LABEL_COLORS[theme === "light" ? "light" : "dark"];
  let spawnedAt = lastSpawn;

  // The exclusion box comes from measuring the DOM, so treat it as advisory:
  // if it ever covers most of the canvas, every spawn would be rejected and
  // the labels would vanish with no error. Better to overlap occasionally
  // than to disappear.
  let avoid = opts.avoid;
  if (avoid) {
    const covered =
      ((avoid.right - avoid.left) * (avoid.bottom - avoid.top)) / (width * height || 1);
    if (covered > 0.7) avoid = null;
  }

  // Kept clear of the viewport edges so captions never clip, and below the
  // floating navbar.
  const minX = 44;
  const maxX = width - 200;
  const minY = 150;
  const maxY = height - 130;

  if (t - spawnedAt > SPAWN_INTERVAL && labels.length < MAX_LABELS && maxX > minX && maxY > minY) {
    // The hero content sits above the canvas, so a label landing under it
    // would simply vanish. Retry a handful of positions before giving up
    // for this frame.
    for (let attempt = 0; attempt < 14; attempt++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);

      if (
        avoid &&
        x + 150 > avoid.left &&
        x < avoid.right &&
        y + 14 > avoid.top &&
        y - 14 < avoid.bottom
      ) {
        continue;
      }
      // Skip a spawn that would land on top of a label already showing.
      if (labels.some((l) => Math.abs(l.x - x) < 170 && Math.abs(l.y - y) < 46)) continue;

      labels.push({
        text: LABEL_TEXTS[Math.floor(Math.random() * LABEL_TEXTS.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        x,
        y,
        born: t,
      });
      spawnedAt = t;
      break;
    }
  }

  ctx.font = '500 13px "Space Grotesk", Inter, system-ui, sans-serif';
  ctx.textBaseline = "middle";

  for (let i = labels.length - 1; i >= 0; i--) {
    const label = labels[i];
    const age = t - label.born;
    if (age > LABEL_LIFE) {
      labels.splice(i, 1);
      continue;
    }

    let alpha = theme === "light" ? 0.72 : 0.85;
    if (age < FADE_IN) alpha *= age / FADE_IN;
    else if (age > LABEL_LIFE - FADE_OUT) alpha *= (LABEL_LIFE - age) / FADE_OUT;

    const [r, g, b] = label.color;
    // Labels ride the same swell as the dots, a beat behind.
    const bob = 3 * Math.sin(0.6 * age + label.x * 0.01);
    const cy = label.y + bob;

    // Soft halo so the caption separates from the dot field behind it.
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(label.x, cy, 7, 0, TWO_PI);
    ctx.fill();

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(label.x, cy, 2.6, 0, TWO_PI);
    ctx.fill();
    ctx.fillText(label.text, label.x + 11, cy + 0.5);
  }

  ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
  return spawnedAt;
}
