/**
 * Appwrite Storage Image URLs
 * Generated from scripts/upload-all-images.js
 */

const APPWRITE_STORAGE_BASE =
  "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files";
const PROJECT_ID = "6943431e00253c8f9883";

// Helper to construct URL
const getUrl = (fileId: string) =>
  `${APPWRITE_STORAGE_BASE}/${fileId}/view?project=${PROJECT_ID}`;

export const IMAGES = {
  // Profile & Personal
  profile: getUrl("69444ceb001c1eda1331"),
  headshot: getUrl("69444ce3002c5e175da5"),

  // Gallery
  futurize: getUrl("69444ce2001c95350c4b"),
  bestFemaleSTEM: getUrl("69444cdf000b777ae190"),
  campusRandom: getUrl("69444ce0003751f98136"),
  outstandingStudent: getUrl("69444ce8001e445ec46b"),
  akwabaNight: getUrl("69444cdd0020f51410ef"),
  pagentry: getUrl("69444ce9003e253e4249"),

  // Education
  atuLogo: getUrl("69444cdb00195a0cc8ab"),

  // Projects
  portfolioV2: getUrl("69444cfb0020fb902f77"),
  sakamaPetroleum: getUrl("69444ced001d6821a234"),
  colorSchemeGenerator: getUrl("69444cfe00302110bb02"),
  psGDarkmode: getUrl("69444cec0011ec4fc0d8"),
  omninifood: getUrl("69444ce60028e9b96e28"),
  liveSnapshot: getUrl("69444ce4002974596ca8"),

  // Blog placeholders
  blogPlaceholder1: getUrl("69444cef000da2150f34"),
  blogPlaceholder2: getUrl("69444cf000057a457f95"),
  blogPlaceholder3: getUrl("69444cf00032bc7780ff"),

  // Platform logos
  codecademy: getUrl("69444cf9000034490b06"),
  scrimba: getUrl("69444cfa002656e07bf5"),
  frontendMasters: getUrl("69444cf90028bcba5187"),
  coursera: getUrl("69444cf7002630d6e37f"),
  aws: getUrl("69444cf8000fb4abc729"),

  // Site logos
  oceanicLogo: getUrl("69444cf6002987c3841b"),
  favicon16: getUrl("69444cf50014cc3996b9"),
  favicon32: getUrl("69444cf6000260351d60"),
  appleTouchIcon: getUrl("69444cf40014e793ac14"),
  androidChrome192: getUrl("69444cf2002402a5429a"),
  androidChrome512: getUrl("69444cf3001450f18ac0"),
} as const;

export default IMAGES;
