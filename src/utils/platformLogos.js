/**
 * Platform Logo Mapping
 * Maps platform names to their logo URLs
 * First tries local images, then falls back to CDN or Simple Icons
 */

export const platformLogos = {
  Codecademy: {
    local:
      "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cf9000034490b06/view?project=6943431e00253c8f9883",
    cdn: "https://cdn.simpleicons.org/codecademy/1F4056",
    fallback: "CC",
    color: "#1F4056",
  },
  Scrimba: {
    local:
      "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cfa002656e07bf5/view?project=6943431e00253c8f9883",
    cdn: "https://cdn.simpleicons.org/scrimba/2B283A",
    fallback: "SB",
    color: "#2B283A",
  },
  "AWS Training": {
    local:
      "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cf8000fb4abc729/view?project=6943431e00253c8f9883",
    cdn: "https://cdn.simpleicons.org/amazonaws/FF9900",
    fallback: "AWS",
    color: "#FF9900",
  },
  "Frontend Masters": {
    local:
      "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cf90028bcba5187/view?project=6943431e00253c8f9883",
    cdn: "https://cdn.simpleicons.org/frontendmentor/3F54A3",
    fallback: "FM",
    color: "#3F54A3",
  },
  Coursera: {
    local:
      "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cf7002630d6e37f/view?project=6943431e00253c8f9883",
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
