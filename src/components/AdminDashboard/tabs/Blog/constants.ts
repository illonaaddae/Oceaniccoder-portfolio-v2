import { BlogPost } from "@/types";

export const CATEGORIES = [
  "Development",
  "Leadership",
  "Community",
  "Career",
  "Tutorial",
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
