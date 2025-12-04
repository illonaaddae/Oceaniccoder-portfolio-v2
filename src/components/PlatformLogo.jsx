import React, { useState } from "react";
import { getPlatformLogo } from "../utils/platformLogos";

/**
 * PlatformLogo Component
 * Displays platform logos with fallback support
 * Tries local images first, then CDN, then fallback text
 */
const PlatformLogo = ({ platformName, className = "w-4 h-4" }) => {
  const [imageError, setImageError] = useState(false);
  const [tryCDN, setTryCDN] = useState(false);
  const logoInfo = getPlatformLogo(platformName);

  // Determine which image source to use
  const imageSrc = tryCDN ? logoInfo.cdn : logoInfo.local || logoInfo.cdn;

  // If no image sources available, show fallback immediately
  if (!logoInfo.local && !logoInfo.cdn) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded ${className} text-[10px] font-bold`}
        style={{
          backgroundColor: `${logoInfo.color}20`,
          color: logoInfo.color,
        }}
        title={platformName}
      >
        {logoInfo.fallback}
      </span>
    );
  }

  // If both local and CDN failed, show fallback
  if (imageError && (tryCDN || (!logoInfo.local && logoInfo.cdn))) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded ${className} text-[10px] font-bold`}
        style={{
          backgroundColor: `${logoInfo.color}20`,
          color: logoInfo.color,
        }}
        title={platformName}
      >
        {logoInfo.fallback}
      </span>
    );
  }

  const handleImageError = () => {
    // If local image failed and we haven't tried CDN yet, try CDN
    if (!tryCDN && logoInfo.local && logoInfo.cdn) {
      setTryCDN(true);
      // Don't set imageError yet, allow CDN to try
    } else {
      // CDN also failed or no CDN available, show fallback
      setImageError(true);
    }
  };

  // Check if this platform should preserve original colors (no filters)
  const preserveColors =
    platformName === "Frontend Masters" ||
    platformName === "Scrimba" ||
    platformName === "AWS Training";

  return (
    <img
      src={imageSrc}
      alt={`${platformName} logo`}
      className={`${className} object-contain ${
        preserveColors ? "platform-logo-original" : ""
      }`}
      onError={handleImageError}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      title={platformName}
    />
  );
};

export default PlatformLogo;
