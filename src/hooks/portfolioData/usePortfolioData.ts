/**
 * Main portfolio data hook, backed by TanStack Query.
 *
 * The public shape is unchanged from the hand-rolled version it replaced, so
 * call sites did not need touching. What changed underneath:
 *
 * - Multiple components calling this on the same page now share one request
 *   per resource. Previously each caller ran its own nine-request fan-out on
 *   mount, because the old module cache was only populated *after* a fetch
 *   resolved and could not dedupe requests already in flight.
 * - Cached data paints immediately and refreshes in the background once
 *   stale, instead of blocking behind a spinner.
 * - State lives in the query cache rather than in nine `useState` arrays per
 *   caller, so the same list is no longer held several times over.
 *
 * @module hooks/portfolioData/usePortfolioData
 */

import { useCallback, useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  getProjects,
  getFeaturedProjects,
  getCertifications,
  getSkills,
  getEducation,
  getGallery,
  getJourney,
  getAbout,
  getBlogPosts,
} from "@/services/api";
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
import { queryKeys } from "@/lib/queryKeys";
import type { PortfolioData } from "./types";
import {
  getStaticProjects,
  getStaticCertifications,
  getStaticEducation,
  getStaticJourney,
  getStaticGallery,
} from "./fallbacks";

/**
 * Appwrite returning an empty list is treated the same as a failure: both
 * mean "nothing to show", and the bundled static content is a better
 * fallback than an empty page. Matches the previous behaviour.
 */
function withFallback<T>(data: T[] | undefined, isError: boolean, fallback: T[]): T[] {
  if (isError || !data || data.length === 0) return fallback;
  return data;
}

export function usePortfolioData(): PortfolioData {
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: [
      { queryKey: queryKeys.projects, queryFn: getProjects },
      { queryKey: queryKeys.featuredProjects, queryFn: getFeaturedProjects },
      { queryKey: queryKeys.certifications, queryFn: getCertifications },
      { queryKey: queryKeys.skills, queryFn: getSkills },
      { queryKey: queryKeys.education, queryFn: getEducation },
      { queryKey: queryKeys.gallery, queryFn: getGallery },
      { queryKey: queryKeys.journey, queryFn: getJourney },
      { queryKey: queryKeys.about, queryFn: getAbout },
      { queryKey: queryKeys.blogPosts, queryFn: getBlogPosts },
    ],
  });

  const [
    projectsQuery,
    featuredQuery,
    certificationsQuery,
    skillsQuery,
    educationQuery,
    galleryQuery,
    journeyQuery,
    aboutQuery,
    blogQuery,
  ] = results;

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.all });
  }, [queryClient]);

  return useMemo(() => {
    const staticProjects = getStaticProjects();

    // Only the first load blocks. Once anything is cached, `isPending` is
    // false and the refresh happens behind the already-rendered content.
    const loading = results.some((r) => r.isPending);
    const failed = results.filter((r) => r.isError).length;

    return {
      projects: withFallback(projectsQuery.data, projectsQuery.isError, staticProjects),
      featuredProjects: withFallback(
        featuredQuery.data,
        featuredQuery.isError,
        staticProjects.filter((p) => p.featured),
      ),
      certifications: withFallback(
        certificationsQuery.data,
        certificationsQuery.isError,
        getStaticCertifications(),
      ) as Certification[],
      // Skills have no bundled fallback — an empty list is the honest answer.
      skills: (skillsQuery.data ?? []) as Skill[],
      education: withFallback(
        educationQuery.data,
        educationQuery.isError,
        getStaticEducation(),
      ) as Education[],
      gallery: (
        withFallback(galleryQuery.data, galleryQuery.isError, getStaticGallery()) as GalleryImage[]
      ).filter((img) => img.isPublic !== false),
      journey: withFallback(
        journeyQuery.data,
        journeyQuery.isError,
        getStaticJourney(),
      ) as Journey[],
      blogPosts: (blogQuery.data ?? []) as BlogPost[],
      about: (aboutQuery.data ?? null) as About | null,
      loading,
      error: failed > 0 ? "Failed to load data. Using cached data." : null,
      refetch,
    } satisfies PortfolioData & { projects: Project[] };
  }, [
    results,
    projectsQuery,
    featuredQuery,
    certificationsQuery,
    skillsQuery,
    educationQuery,
    galleryQuery,
    journeyQuery,
    aboutQuery,
    blogQuery,
    refetch,
  ]);
}
