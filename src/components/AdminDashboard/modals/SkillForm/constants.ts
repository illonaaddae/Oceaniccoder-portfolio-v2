export const categories: string[] = [
  "Frontend Development",
  "Backend Development",
  "Mobile Development",
  "Cloud & DevOps",
  "AI & Data Science",
  "Design & Tools",
  "Leadership & Soft Skills",
  "Currently Learning",
  "Other",
];

// The selectable skill-icon catalog lives in one place — the shared icon
// registry — so the admin dropdown and the public site render from the same
// source. See src/utils/data/skillIconRegistry.jsx to add new icons.
export {
  ICON_GROUPS as iconGroups,
  ICON_OPTIONS as iconOptions,
} from "@/utils/data/skillIconRegistry.jsx";
