import type {
  Skill,
  Project,
  Certification,
  GalleryImage,
  Education,
  Journey,
  BlogPost,
  Message,
} from "@/types";
import { useFilteredCore } from "./useFilteredCore";
import { useFilteredExtra } from "./useFilteredExtra";

export function useFilteredData(
  searchQuery: string,
  messages: Message[],
  skills: Skill[],
  projects: Project[],
  certifications: Certification[],
  gallery: GalleryImage[],
  education: Education[],
  journey: Journey[],
  blogPosts: BlogPost[],
) {
  const core = useFilteredCore(
    searchQuery,
    messages,
    skills,
    projects,
    certifications,
  );
  const extra = useFilteredExtra(
    searchQuery,
    gallery,
    education,
    journey,
    blogPosts,
  );
  return { ...core, ...extra };
}
