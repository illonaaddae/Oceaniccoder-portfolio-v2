/**
 * Portfolio Data Hooks - Barrel export
 * @module hooks/portfolioData
 */

export type { PortfolioData } from "./types";
export { usePortfolioData } from "./usePortfolioData";
export {
  useProjects,
  useFeaturedProjects,
  useCertifications,
} from "./individualHooks";
