import React from "react";
import { Link } from "react-router-dom";
import { LOGO_PATHS } from "./navData";

const Logo = React.memo(function Logo({ theme }) {
  const isDark = theme === "dark";

  const img = (
    <img
      src={isDark ? LOGO_PATHS.dark : LOGO_PATHS.light}
      alt="Oceaniccoder"
      className={`h-8 w-auto object-contain group-hover:scale-105 transition-transform duration-300 ${
        isDark ? "brightness-0 invert sepia saturate-[5] hue-rotate-[175deg]" : ""
      }`}
      width="112"
      height="32"
      loading="eager"
      decoding="async"
      fetchPriority="high"
    />
  );

  return (
    <Link to="/" aria-label="Go to homepage" className="group mr-4">
      {/* Light mode serves WebP with the PNG as fallback. Dark mode keeps the
          SVG, which the CSS filter above recolours into a flat silhouette. */}
      {isDark ? (
        img
      ) : (
        <picture>
          <source srcSet={LOGO_PATHS.lightWebp} type="image/webp" />
          {img}
        </picture>
      )}
    </Link>
  );
});

export default Logo;
