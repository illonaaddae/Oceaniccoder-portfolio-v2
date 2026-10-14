import React from "react";
import { LOGO_PATHS } from "../Navbar/navData";

const FooterBrand = React.memo(({ theme }) => (
  <div className="lg:col-span-2">
    <div className="mb-6">
      <picture>
        <source srcSet={LOGO_PATHS.webp} type="image/webp" />
        <img
          src={theme === "dark" ? LOGO_PATHS.dark : LOGO_PATHS.light}
          alt="Oceaniccoder"
          width="168"
          height="48"
          loading="lazy"
          decoding="async"
          className={`h-12 w-auto object-contain ${
            theme === "dark" ? "brightness-0 invert sepia saturate-[5] hue-rotate-[175deg]" : ""
          }`}
        />
      </picture>
      <p className="text-sm text-gray-200 mt-2">Illona Addae</p>
    </div>

    <p className="text-gray-200 leading-relaxed mb-6 max-w-md">
      Software and AI engineer, community leader, dedicated to creating inclusive tech spaces and
      building innovative solutions that make a difference.
    </p>
  </div>
));

FooterBrand.displayName = "FooterBrand";

export default FooterBrand;
