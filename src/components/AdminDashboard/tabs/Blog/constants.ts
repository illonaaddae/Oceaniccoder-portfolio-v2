import { BlogPost } from "@/types";

/**
 * Grouped loosely by what a post is doing, then alphabetical within reason.
 * "Other" stays last so it reads as the fallback rather than a real choice.
 */
export const CATEGORIES = [
  // Building
  "Development",
  "Frontend",
  "Backend",
  "Mobile",
  "Cloud & DevOps",
  "AI & Data",
  "Security",
  "Design & UX",
  "Performance",
  "Open Source",
  // Teaching
  "Tutorial",
  "Case Study",
  "Tools & Workflow",
  // Reflecting
  "Career",
  "Leadership",
  "Community",
  "Personal",
  "Tech News",
  "Other",
];

export const DEFAULT_FORM_DATA: Partial<BlogPost> = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  tags: [],
  publishedAt: new Date().toISOString().split("T")[0],
  readTime: "",
  image: "",
  featured: false,
  published: true,
};
