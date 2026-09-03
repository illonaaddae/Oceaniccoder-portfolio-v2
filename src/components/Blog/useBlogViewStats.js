import { useEffect, useState } from "react";
import { getAllBlogViewStats } from "../../services/api";

/**
 * Readership for every post, keyed by post id — one round trip for the whole
 * listing rather than a request per card. Empty until it resolves, so cards
 * render immediately and the counts fill in.
 */
export const useBlogViewStats = () => {
  const [viewStats, setViewStats] = useState({});

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
};
