/**
 * Individual data hooks for specific domains.
 *
 * These share the same query cache as `usePortfolioData`, so a page using
 * both no longer fetches projects twice.
 *
 * @module hooks/portfolioData/individualHooks
 */

import { useQuery } from "@tanstack/react-query";
import { getProjects } from "@/services/api";
import type { Project } from "@/types";
import { queryKeys } from "@/lib/queryKeys";
import { getStaticProjects } from "./fallbacks";

export function useProjects() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: getProjects,
  });

  const projects: Project[] = isError ? getStaticProjects() : (data ?? []);
  return { projects, loading: isPending };
}
