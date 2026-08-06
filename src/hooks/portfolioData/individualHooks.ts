/**
 * Individual data hooks for specific domains.
 *
 * These share the same query cache as `usePortfolioData`, so a page using
 * both no longer fetches projects twice.
 *
 * @module hooks/portfolioData/individualHooks
 */

import { useQuery } from "@tanstack/react-query";
import { getProjects, getFeaturedProjects, getCertifications } from "@/services/api";
import type { Project, Certification } from "@/types";
import { queryKeys } from "@/lib/queryKeys";
import { getStaticProjects, getStaticCertifications } from "./fallbacks";

export function useProjects() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: getProjects,
  });

  const projects: Project[] = isError ? getStaticProjects() : (data ?? []);
  return { projects, loading: isPending };
}

export function useFeaturedProjects() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.featuredProjects,
    queryFn: getFeaturedProjects,
  });

  // An empty result falls back too — the section looks broken without cards.
  const projects: Project[] =
    isError || !data || data.length === 0 ? getStaticProjects().filter((p) => p.featured) : data;

  return { projects, loading: isPending };
}

export function useCertifications() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.certifications,
    queryFn: getCertifications,
  });

  const certifications: Certification[] = isError ? getStaticCertifications() : (data ?? []);
  return { certifications, loading: isPending };
}
