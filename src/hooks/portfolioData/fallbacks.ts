/**
 * Static fallback data transformers
 * @module hooks/portfolioData/fallbacks
 */

import { PROJECTS_DATA } from "@/utils/data/projects";
import certifications_static from "@/utils/data/certifications";
import education_static from "@/utils/data/education";
import journey_static from "@/utils/data/journey";
import gallery_static from "@/utils/data/gallery";
import type { Project, Certification, Education, Journey, GalleryImage } from "@/types";

// Each fallback is built once, so callers get the same array on every render
// and effects or memos keyed on it don't re-fire.
function once<T>(build: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= build());
}

export const getStaticProjects = once(
  (): Project[] =>
    PROJECTS_DATA.map((p, idx) => ({
      ...p,
      $id: `static-${idx}`,
    })) as unknown as Project[],
);

export const getStaticCertifications = once(
  (): Certification[] =>
    (certifications_static?.map((c: Record<string, unknown>, idx: number) => ({
      ...c,
      $id: `static-cert-${idx}`,
    })) as unknown as Certification[]) || [],
);

export const getStaticEducation = once(
  (): Education[] =>
    (education_static?.map((e: Record<string, unknown>, idx: number) => ({
      ...e,
      $id: `static-edu-${idx}`,
    })) as unknown as Education[]) || [],
);

export const getStaticJourney = once(
  (): Journey[] =>
    (journey_static?.map((j: Record<string, unknown>, idx: number) => ({
      ...j,
      $id: `static-journey-${idx}`,
    })) as unknown as Journey[]) || [],
);

export const getStaticGallery = once(
  (): GalleryImage[] =>
    (gallery_static?.map((g: Record<string, unknown>, idx: number) => ({
      ...g,
      $id: `static-gallery-${idx}`,
    })) as unknown as GalleryImage[]) || [],
);
