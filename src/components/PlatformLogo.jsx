import React, { useState, useEffect } from "react";
import { getPlatformLogo, applyPlatformLogoOverrides } from "../utils/platformLogos";
import { getPlatformLogoOverrides } from "../services/api/settings";

let overridesLoaded = false;
let overridesPromise = null;

function ensureOverridesLoaded() {
  if (overridesLoaded) return Promise.resolve();
  if (overridesPromise) return overridesPromise;
  overridesPromise = getPlatformLogoOverrides()
    .then((overrides) => {
      applyPlatformLogoOverrides(overrides);
      overridesLoaded = true;
    })
    .catch(() => {
      overridesLoaded = true;
    });
  return overridesPromise;
}

/**
 * PlatformLogo Component
 * Displays platform logos with fallback support
 * Tries local images first, then CDN, then fallback text
 * @param {{ platformName: string, iconUrl?: string, className?: string }} props
 */
const PlatformLogo = ({ platformName, iconUrl = undefined, className = "w-4 h-4" }) => {
  const [imageError, setImageError] = useState(false);
  const [tryCDN, setTryCDN] = useState(false);
  const [overridesReady, setOverridesReady] = useState(overridesLoaded);

  useEffect(() => {
    if (!overridesReady) {
      ensureOverridesLoaded().then(() => setOverridesReady(true));
    }
  }, [overridesReady]);

  const baseLogoInfo = getPlatformLogo(platformName);
  const logoInfo = iconUrl ? { ...baseLogoInfo, local: iconUrl } : baseLogoInfo;

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

  // All logos preserve original brand colors — no tinting applied
  const preserveColors = true;

  return (
    <img
      src={imageSrc}
      alt={`${platformName} logo`}
      className={`${className} object-contain ${preserveColors ? "platform-logo-original" : ""}`}
      onError={handleImageError}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      title={platformName}
    />
  );
};

export default PlatformLogo;
