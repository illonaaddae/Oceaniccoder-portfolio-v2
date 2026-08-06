/**
 * Shared QueryClient.
 *
 * Exported as a module singleton rather than created inside a component so
 * that non-React code — notably the admin dashboard's data-reload path — can
 * invalidate public queries after a write.
 *
 * @module lib/queryClient
 */

import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

/** Cached content paints immediately; anything older refreshes in the background. */
export const PUBLIC_STALE_TIME = 5 * 60 * 1000;
const PUBLIC_GC_TIME = 30 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: PUBLIC_STALE_TIME,
      gcTime: PUBLIC_GC_TIME,
      // Portfolio content changes rarely — refetching every time the visitor
      // tabs back would be noise, not freshness.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

/**
 * Marks every public read stale so the next render refetches it.
 *
 * Called after admin writes. Invalidation only flags the data — it does not
 * block, and visitors keep seeing the previous values until the refetch
 * lands, so there is no spinner flash.
 */
export function invalidatePublicData(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.all });
}
