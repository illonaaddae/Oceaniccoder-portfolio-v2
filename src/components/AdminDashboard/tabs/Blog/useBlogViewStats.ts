import { useEffect, useState } from "react";
import { getAllBlogViewStats } from "@/services/api/blogViews";
import type { BlogViewStats } from "@/types";

/**
 * Readership for every post, keyed by post id. One request for the whole
 * list rather than one per row.
 */
export function useBlogViewStats(): Record<string, BlogViewStats> {
  const [viewStats, setViewStats] = useState<Record<string, BlogViewStats>>({});

  useEffect(() => {
    let active = true;
    getAllBlogViewStats()
      .then((stats) => {
        if (active) setViewStats(stats);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return viewStats;
}
