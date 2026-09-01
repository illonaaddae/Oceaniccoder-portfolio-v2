import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolio } from "../../Context";

/**
 * Custom hook encapsulating Navbar scroll state and navigation logic.
 */
export default function useNavbar() {
  const { navItems, activeSection, setActiveSection, isMenuOpen, setIsMenuOpen } = usePortfolio();

  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = useCallback(
    (href, id) => {
      setActiveSection(id);
      setIsMenuOpen(false);

      try {
        if (/^(https?:)?\/\//i.test(href)) {
          window.open(href, "_blank", "noopener,noreferrer");
          return;
        }
      } catch (_) {}

      if (href && href.startsWith("/")) {
        navigate(href);
        // Clicking Home while already on "/" is not a route change, so
        // RouteChangeHandler never fires and the visitor stays wherever they
        // had scrolled to. Nav clicks always return to the top of the target.
        try {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } catch (_) {
          // non-browser environment
        }
      }
    },
    [navigate, setActiveSection, setIsMenuOpen],
  );

  const toggleMenu = useCallback(() => setIsMenuOpen((prev) => !prev), [setIsMenuOpen]);

  const closeMenu = useCallback(() => setIsMenuOpen(false), [setIsMenuOpen]);

  return {
    navItems,
    activeSection,
    setActiveSection,
    isMenuOpen,
    scrolled,
    handleNavClick,
    toggleMenu,
    closeMenu,
  };
}
