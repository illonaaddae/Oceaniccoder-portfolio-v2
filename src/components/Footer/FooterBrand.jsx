import React from "react";

const FooterBrand = React.memo(({ theme }) => (
  <div className="lg:col-span-2">
    <div className="mb-6">
      <img
        src={
          theme === "dark"
            ? "/images/logo/Oceaniccoder-croped.svg"
            : "/images/logo/Oceaniccoder-croped.png"
        }
        alt="Oceaniccoder"
        className={`h-12 w-auto object-contain ${
          theme === "dark"
            ? "brightness-0 invert sepia saturate-[5] hue-rotate-[175deg]"
            : ""
        }`}
      />
      <p className="text-sm text-gray-400 mt-2">Illona Addae</p>
    </div>

    <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
      Passionate full-stack developer and community leader dedicated to creating
      inclusive tech spaces and building innovative solutions that make a
      difference.
    </p>
  </div>
));

FooterBrand.displayName = "FooterBrand";

export default FooterBrand;
