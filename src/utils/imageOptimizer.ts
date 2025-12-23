import { STORAGE_BUCKET_ID } from "../lib/appwrite";

/**
 * Image optimization utilities for Appwrite Storage
 * Uses Appwrite's built-in image transformation capabilities
 */

// Appwrite configuration for URL building
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6943431e00253c8f9883";

// Standard image sizes for different use cases
export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  card: { width: 400, height: 300 },
  blog: { width: 800, height: 450 },
  hero: { width: 1200, height: 675 },
  full: { width: 1920, height: 1080 },
} as const;

/**
 * Check if a URL is from Appwrite Storage
 */
export function isAppwriteUrl(url: string): boolean {
  return url?.includes("appwrite.io") && url.includes("/storage/");
}

/**
 * Extract file ID from an Appwrite Storage URL
 * URL format: https://fra.cloud.appwrite.io/v1/storage/buckets/{bucketId}/files/{fileId}/view
 * or: https://fra.cloud.appwrite.io/v1/storage/buckets/{bucketId}/files/{fileId}/preview
 */
export function getFileIdFromUrl(url: string): string | null {
  if (!url || !isAppwriteUrl(url)) return null;

  try {
    // Match both /view and /preview endpoints
    const match = url.match(/\/files\/([^/?]+)(?:\/(?:view|preview))?/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Get an optimized preview URL for an Appwrite image
 * @param url - Original Appwrite storage URL
 * @param width - Desired width
 * @param height - Desired height (optional, will maintain aspect ratio if not provided)
 * @param quality - Image quality (0-100), defaults to 80
 * @returns Optimized preview URL or original URL if not an Appwrite URL
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality: number = 80
): string {
  if (!url) return url;

  const fileId = getFileIdFromUrl(url);
  if (!fileId) return url;

  try {
    // Build the preview URL manually to ensure project parameter is included
    // This ensures the URL works from any domain without authentication issues
    const params = new URLSearchParams();
    if (width) params.append("width", width.toString());
    if (height) params.append("height", height.toString());
    params.append("quality", quality.toString());
    params.append("project", APPWRITE_PROJECT_ID);

    const previewUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${fileId}/preview?${params.toString()}`;
    return previewUrl;
  } catch (error) {
    console.warn("Failed to generate optimized image URL:", error);
    return url;
  }
}

/**
 * Get responsive image URLs for different screen sizes
 * @param url - Original Appwrite storage URL
 * @returns Object with URLs for different sizes
 */
export function getResponsiveImageUrls(url: string): {
  thumbnail: string;
  card: string;
  blog: string;
  hero: string;
  full: string;
  original: string;
} {
  return {
    thumbnail: getOptimizedImageUrl(
      url,
      IMAGE_SIZES.thumbnail.width,
      IMAGE_SIZES.thumbnail.height
    ),
    card: getOptimizedImageUrl(
      url,
      IMAGE_SIZES.card.width,
      IMAGE_SIZES.card.height
    ),
    blog: getOptimizedImageUrl(
      url,
      IMAGE_SIZES.blog.width,
      IMAGE_SIZES.blog.height
    ),
    hero: getOptimizedImageUrl(
      url,
      IMAGE_SIZES.hero.width,
      IMAGE_SIZES.hero.height
    ),
    full: getOptimizedImageUrl(
      url,
      IMAGE_SIZES.full.width,
      IMAGE_SIZES.full.height
    ),
    original: url,
  };
}

/**
 * Generate srcSet for responsive images
 * @param url - Original Appwrite storage URL
 * @param sizes - Array of widths to generate
 * @returns srcSet string for use in img tag
 */
export function generateSrcSet(
  url: string,
  sizes: number[] = [320, 640, 768, 1024, 1280, 1920]
): string {
  if (!isAppwriteUrl(url)) return "";

  return sizes
    .map((width) => {
      const optimizedUrl = getOptimizedImageUrl(url, width);
      return `${optimizedUrl} ${width}w`;
    })
    .join(", ");
}

/**
 * Get optimized URL based on intended display size
 * @param url - Original image URL
 * @param displayType - Type of display context
 */
export function getImageForContext(
  url: string,
  displayType: "thumbnail" | "card" | "blog" | "hero" | "full" = "card"
): string {
  if (!url) return url;

  const size = IMAGE_SIZES[displayType];
  return getOptimizedImageUrl(url, size.width, size.height);
}
