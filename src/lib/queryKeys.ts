/**
 * Query key factory for public portfolio data.
 *
 * Every key lives here so the read hooks and the admin invalidation bridge
 * can never drift apart — a typo in a key string is otherwise silent, and
 * shows up only as content that refuses to refresh.
 *
 * @module lib/queryKeys
 */

export const PUBLIC_DATA_ROOT = "public-data" as const;

export const queryKeys = {
  /** Root of every public read. Invalidate this to refresh the whole site. */
  all: [PUBLIC_DATA_ROOT] as const,
  projects: [PUBLIC_DATA_ROOT, "projects"] as const,
  featuredProjects: [PUBLIC_DATA_ROOT, "featured-projects"] as const,
  certifications: [PUBLIC_DATA_ROOT, "certifications"] as const,
  skills: [PUBLIC_DATA_ROOT, "skills"] as const,
  education: [PUBLIC_DATA_ROOT, "education"] as const,
  gallery: [PUBLIC_DATA_ROOT, "gallery"] as const,
  journey: [PUBLIC_DATA_ROOT, "journey"] as const,
  about: [PUBLIC_DATA_ROOT, "about"] as const,
  blogPosts: [PUBLIC_DATA_ROOT, "blog-posts"] as const,
} as const;
