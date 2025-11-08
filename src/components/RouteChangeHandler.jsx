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
    // Smoothly scroll to top on navigation to avoid sudden jumps
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch (e) {
      // ignore for non-browser environments
    }
  }, [location]);

  return null;
};

export default RouteChangeHandler;
