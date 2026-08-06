/**
 * Portfolio Data Types & Cache
 * @module hooks/portfolioData/types
 */

import type {
  Project,
  Certification,
  Skill,
  Education,
  GalleryImage,
  Journey,
  About,
  BlogPost,
} from "@/types";

export interface PortfolioData {
  projects: Project[];
  featuredProjects: Project[];
  certifications: Certification[];
  skills: Skill[];
  education: Education[];
  gallery: GalleryImage[];
  journey: Journey[];
  blogPosts: BlogPost[];
  about: About | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Cache lives in the TanStack Query client now (see `lib/queryClient`); the
 * hand-rolled `dataCache` / `isCacheValid` / `CACHE_DURATION` trio that used
 * to sit here was removed with the migration.
 */
