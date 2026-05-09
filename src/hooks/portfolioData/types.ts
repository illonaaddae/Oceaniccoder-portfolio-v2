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

export const dataCache: {
  projects?: Project[];
  featuredProjects?: Project[];
  certifications?: Certification[];
  skills?: Skill[];
  education?: Education[];
  gallery?: GalleryImage[];
  journey?: Journey[];
  blogPosts?: BlogPost[];
  about?: About | null;
  timestamp?: number;
} = {};

export const CACHE_DURATION = 1 * 60 * 1000; // 1 minute

export function isCacheValid(): boolean {
  return !!(
    dataCache.timestamp && Date.now() - dataCache.timestamp < CACHE_DURATION
  );
}
