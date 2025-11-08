import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Small helper that disables browser scroll restoration (so mounts don't jump)
// and performs a smooth scroll-to-top on every route change.
const RouteChangeHandler = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        window.history &&
        window.history.scrollRestoration
      ) {
        window.history.scrollRestoration = "manual";
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Scroll to top on navigation. Use 'auto' to avoid triggering
    // heavy compositor work on mobile (smooth can cause repaints/flashes).
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (e) {
      // ignore for non-browser environments
    }
  }, [location]);

  return null;
};

export default RouteChangeHandler;
