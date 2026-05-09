import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolio } from "../../Context";

/**
 * Custom hook encapsulating Navbar scroll state and navigation logic.
 */
export default function useNavbar() {
  const {
    navItems,
    activeSection,
    setActiveSection,
    isMenuOpen,
    setIsMenuOpen,
  } = usePortfolio();

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
      }
    },
    [navigate, setActiveSection, setIsMenuOpen],
  );

  const toggleMenu = useCallback(
    () => setIsMenuOpen((prev) => !prev),
    [setIsMenuOpen],
  );

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
