import React from "react";
import { LOGO_PATHS } from "./navData";

const Logo = React.memo(function Logo({ theme }) {
  return (
    <div className="group mr-4">
      <img
        src={theme === "dark" ? LOGO_PATHS.dark : LOGO_PATHS.light}
        alt="Oceaniccoder"
        className={`h-8 w-auto object-contain group-hover:scale-105 transition-transform duration-300 ${
          theme === "dark"
            ? "brightness-0 invert sepia saturate-[5] hue-rotate-[175deg]"
            : ""
        }`}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
});

export default Logo;
