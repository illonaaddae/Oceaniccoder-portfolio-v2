/**
 * Site images in Azure Blob (moved from Appwrite Storage; each path keeps the
 * old Appwrite file id).
 */
import { MEDIA_BASE_URL } from "./imageOptimizer";

const media = (path: string) => `${MEDIA_BASE_URL}/${path}`;

export const IMAGES = {
  // Profile & Personal
  profile: media("69444ceb001c1eda1331/profile.webp"),
  headshot: media("69444ce3002c5e175da5/headshot.webp"),

  // Gallery
  futurize: media("69444ce2001c95350c4b/futurize.webp"),
  bestFemaleSTEM: media("69444cdf000b777ae190/best-female-student-in-stem.webp"),
  campusRandom: media("69444ce0003751f98136/campus-random-pic.webp"),
  outstandingStudent: media("69444ce8001e445ec46b/outstanding-student.webp"),
  akwabaNight: media("69444cdd0020f51410ef/akwaba-night.webp"),
  pagentry: media("69444ce9003e253e4249/pagentry.webp"),

  // Education
  atuLogo: media("69444cdb00195a0cc8ab/atu-logo.png"),

  // Projects
  portfolioV2: media("69444cfb0020fb902f77/portfolio-v2-jpg.png"),
  sakamaPetroleum: media("69444ced001d6821a234/sakama-petroleum.png"),
  colorSchemeGenerator: media("69444cfe00302110bb02/the-color-scheme-generator-readme.png"),
  psGDarkmode: media("69444cec0011ec4fc0d8/ps-g-darkmode-ipad-pro.png"),
  omninifood: media("69444ce60028e9b96e28/omninifood.png"),
  liveSnapshot: media("69444ce4002974596ca8/live-snapshot.png"),

  // Blog placeholders
  blogPlaceholder1: media("69444cef000da2150f34/blog-placeholder-1.svg"),
  blogPlaceholder2: media("69444cf000057a457f95/blog-placeholder-2.svg"),
  blogPlaceholder3: media("69444cf00032bc7780ff/blog-placeholder-3.svg"),

  // Platform logos
  codecademy: media("69444cf9000034490b06/code-cademy.svg"),
  scrimba: media("69444cfa002656e07bf5/scrimba.png"),
  frontendMasters: media("69444cf90028bcba5187/frontendmasters.png"),
  coursera: media("69444cf7002630d6e37f/coursera.png"),
  aws: media("69444cf8000fb4abc729/aws-logo.svg"),
} as const;

export default IMAGES;
