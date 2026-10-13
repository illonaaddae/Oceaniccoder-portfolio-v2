import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/utils/analytics/tracker";

// Records one page view per route change. The ref dedupes StrictMode's double
// effect and re-renders on the same path; query-only changes are not new views.
// Renders nothing. Consent, exclusions and the feature flag live in the tracker.
const PageViewTracker = () => {
  const { pathname, search } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname, search);
  }, [pathname, search]);

  return null;
};

export default PageViewTracker;
