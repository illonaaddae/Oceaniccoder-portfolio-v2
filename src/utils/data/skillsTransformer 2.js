import { SKILLS_DATA } from "./skills.jsx";
import { getSkillIcon } from "./skillIcons.jsx";

// Preferred display order for skill categories
const CATEGORY_ORDER = [
  "Frontend Development",
  "Backend Development",
  "Cloud & DevOps",
  "Design & Tools",
  "AI & Data Science",
  "Leadership & Soft Skills",
];

/**
 * Takes the flat Appwrite skills array and returns the grouped format
 * expected by SkillsSection / CategoryButtons / SkillGrid / SkillCard.
 *
 * Falls back to the static SKILLS_DATA if Appwrite returns nothing,
 * so the page is never empty.
 */
export function transformAppwriteSkills(appwriteSkills) {
  if (!appwriteSkills || appwriteSkills.length === 0) return SKILLS_DATA;

  // Group by category
  const grouped = {};
  for (const skill of appwriteSkills) {
    const cat = skill.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({
      name: skill.name,
      level: skill.percentage ?? 0,
      icon: getSkillIcon(skill.name),
    });
  }

  // Sort each category's skills by level descending
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => b.level - a.level);
  }

  // Sort categories by preferred order, then alpha for unknowns
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return sortedCategories.map((category) => ({
    category,
    skills: grouped[category],
  }));
}
