import {
  SiDocker,
  SiFigma,
  SiGit,
  SiJavascript,
  SiNodedotjs,
  SiPostgresql,
  SiPython,
  SiReact,
  SiTailwindcss,
  SiTypescript,
  SiVite,
} from "react-icons/si";
import { FaAws } from "react-icons/fa";

/**
 * The glyphs scattered behind the hero copy.
 *
 * Positions are hand-placed, not random: the headline, typewriter role and
 * CTAs own the left column between roughly 30% and 78% of the hero's height,
 * so nothing is allowed to drift through that box. Everything else is fair
 * game — the upper band runs the full width, the lower band clears the copy,
 * and the right-hand entries sit around the portrait.
 *
 * `delay` is applied negatively, so each glyph is already part-way through its
 * loop on first paint. Without that the hero would open on an empty field and
 * then pop. The values are deliberately unrelated to the durations: shared
 * factors would let the field drift back into unison after a few minutes.
 *
 * top/left are percentages of the hero surface, size and drift are px.
 */
export const TECH_CONSTELLATION = [
  {
    name: "TypeScript",
    Icon: SiTypescript,
    top: 10,
    left: 8,
    size: 46,
    duration: 12,
    delay: 3.2,
    drift: 12,
  },
  { name: "React", Icon: SiReact, top: 7, left: 62, size: 54, duration: 14, delay: 8.1, drift: 14 },
  {
    name: "Node.js",
    Icon: SiNodedotjs,
    top: 18,
    left: 33,
    size: 38,
    duration: 10,
    delay: 1.4,
    drift: 10,
  },
  { name: "Vite", Icon: SiVite, top: 20, left: 74, size: 32, duration: 10, delay: 12.3, drift: 10 },
  {
    name: "Docker",
    Icon: SiDocker,
    top: 22,
    left: 88,
    size: 44,
    duration: 13,
    delay: 6.7,
    drift: 12,
  },
  {
    name: "Python",
    Icon: SiPython,
    top: 26,
    left: 50,
    size: 34,
    duration: 11,
    delay: 9.5,
    drift: 9,
  },
  { name: "AWS", Icon: FaAws, top: 40, left: 92, size: 48, duration: 15, delay: 4.3, drift: 13 },
  {
    name: "PostgreSQL",
    Icon: SiPostgresql,
    top: 55,
    left: 48,
    size: 36,
    duration: 9,
    delay: 11.2,
    drift: 10,
  },
  {
    name: "Tailwind CSS",
    Icon: SiTailwindcss,
    top: 68,
    left: 90,
    size: 42,
    duration: 12,
    delay: 2.6,
    drift: 11,
  },
  {
    name: "JavaScript",
    Icon: SiJavascript,
    top: 79,
    left: 30,
    size: 34,
    duration: 13,
    delay: 10.8,
    drift: 9,
  },
  {
    name: "Figma",
    Icon: SiFigma,
    top: 84,
    left: 58,
    size: 40,
    duration: 14,
    delay: 7.4,
    drift: 12,
  },
  { name: "Git", Icon: SiGit, top: 86, left: 12, size: 44, duration: 11, delay: 5.1, drift: 11 },
];
