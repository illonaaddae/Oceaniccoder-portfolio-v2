import { useCallback, useEffect, useState } from "react";
import { getPostViewStats, recordBlogView } from "../../services/api";
import { getVisitorId } from "./utils";

/** Guard so a refresh inside one browsing session isn't counted as a re-read. */
const sessionKey = (postId) => `blog_view_recorded_${postId}`;

const alreadyCountedThisSession = (postId) => {
  try {
    return sessionStorage.getItem(sessionKey(postId)) === "1";
  } catch {
    // Private mode or blocked storage — count the view rather than lose it.
    return false;
  }
};

const markCountedThisSession = (postId) => {
  try {
    sessionStorage.setItem(sessionKey(postId), "1");
  } catch {
    // Nothing to do; worst case the next visit counts as a re-read.
  }
};

/**
 * Readership for the post being viewed. Records the visit once per browser
 * session, then exposes unique readers and total reads for the header.
 */
export const useBlogViews = (postId) => {
  const [stats, setStats] = useState({ readers: 0, reads: 0 });

  const load = useCallback(async () => {
    if (!postId) return;

    if (alreadyCountedThisSession(postId)) {
      setStats(await getPostViewStats(postId));
      return;
    }

    markCountedThisSession(postId);
    const recorded = await recordBlogView(postId, getVisitorId());
    setStats(recorded ?? (await getPostViewStats(postId)));
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  return stats;
};
