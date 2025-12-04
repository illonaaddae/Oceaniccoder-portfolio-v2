/**
 * Platform Logo Mapping
 * Maps platform names to their logo URLs
 * First tries local images, then falls back to CDN or Simple Icons
 */

export const platformLogos = {
  Codecademy: {
    local: "/images/platforms/code-cademy.svg",
    cdn: "https://cdn.simpleicons.org/codecademy/1F4056",
    fallback: "CC",
    color: "#1F4056",
  },
  Scrimba: {
    local: "/images/platforms/scrimba.png",
    cdn: "https://cdn.simpleicons.org/scrimba/2B283A",
    fallback: "SB",
    color: "#2B283A",
  },
  "AWS Training": {
    local: "/images/platforms/aws-logo.svg",
    cdn: "https://cdn.simpleicons.org/amazonaws/FF9900",
    fallback: "AWS",
    color: "#FF9900",
  },
  "Frontend Masters": {
    local: "/images/platforms/frontendmasters.png",
    cdn: "https://cdn.simpleicons.org/frontendmentor/3F54A3",
    fallback: "FM",
    color: "#3F54A3",
  },
  Coursera: {
    local: "/images/platforms/Coursera.png",
    cdn: "https://cdn.simpleicons.org/coursera/0056D2",
    fallback: "CR",
    color: "#0056D2",
  },
  Udemy: {
    local: null,
    cdn: "https://cdn.simpleicons.org/udemy/A435F0",
    fallback: "UD",
    color: "#A435F0",
  },
};

/**
 * Get platform logo information
 * @param {string} platformName - Name of the platform
 * @returns {object} Logo info with local, cdn, fallback text, and color
 */
export const getPlatformLogo = (platformName) => {
  // Direct match
  if (platformLogos[platformName]) {
    return platformLogos[platformName];
  }

  // Case-insensitive match
  const normalizedName = Object.keys(platformLogos).find(
    (key) => key.toLowerCase() === platformName.toLowerCase()
  );

  if (normalizedName) {
    return platformLogos[normalizedName];
  }

  // Default fallback
  return {
    local: null,
    cdn: null,
    fallback: platformName.substring(0, 2).toUpperCase(),
    color: "#6B7280",
  };
};
