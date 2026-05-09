/**
 * Static fallback data transformers
 * @module hooks/portfolioData/fallbacks
 */

import { PROJECTS_DATA } from "@/utils/data/projects";
import certifications_static from "@/utils/data/certifications";
import education_static from "@/utils/data/education";
import journey_static from "@/utils/data/journey";
import gallery_static from "@/utils/data/gallery";
import type {
  Project,
  Certification,
  Education,
  Journey,
  GalleryImage,
} from "@/types";

export function getStaticProjects(): Project[] {
  return PROJECTS_DATA.map((p, idx) => ({
    ...p,
    $id: `static-${idx}`,
  })) as unknown as Project[];
}

export function getStaticCertifications(): Certification[] {
  return (
    (certifications_static?.map((c: Record<string, unknown>, idx: number) => ({
      ...c,
      $id: `static-cert-${idx}`,
    })) as unknown as Certification[]) || []
  );
}

export function getStaticEducation(): Education[] {
  return (
    (education_static?.map((e: Record<string, unknown>, idx: number) => ({
      ...e,
      $id: `static-edu-${idx}`,
    })) as unknown as Education[]) || []
  );
}

export function getStaticJourney(): Journey[] {
  return (
    (journey_static?.map((j: Record<string, unknown>, idx: number) => ({
      ...j,
      $id: `static-journey-${idx}`,
    })) as unknown as Journey[]) || []
  );
}

export function getStaticGallery(): GalleryImage[] {
  return (
    (gallery_static?.map((g: Record<string, unknown>, idx: number) => ({
      ...g,
      $id: `static-gallery-${idx}`,
    })) as unknown as GalleryImage[]) || []
  );
}
