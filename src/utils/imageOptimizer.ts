import { STORAGE_BUCKET_ID } from "../lib/appwrite";

/**
 * Image optimization for the two places images live while the site moves off
 * Appwrite:
 *
 * - Appwrite Storage, which resizes on request (`/preview?width=…`).
 * - Azure Blob (`<media>/<fileId>/<name>`), which can't resize, so every raster
 *   image has WebP copies at fixed widths next to it (`w480.webp`, `w960.webp`,
 *   `w1600.webp`), made at upload time by /api/media and by
 *   scripts/migrate-storage-to-blob.mjs. A request is served from the smallest
 *   copy at least as wide as asked for.
 *
 * The Appwrite branch goes once the database rows point at Blob.
 */

// Appwrite configuration for URL building
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6943431e00253c8f9883";

/** Base URL of the Blob `media` container, no trailing slash. */
export const MEDIA_BASE_URL = (
  import.meta.env.VITE_AZURE_MEDIA_BASE_URL ||
  "https://oceaniccodermedia.blob.core.windows.net/media"
).replace(/\/+$/, "");

/** Widths of the WebP copies stored next to each raster image (api/shared/media.js). */
export const MEDIA_VARIANT_WIDTHS = [480, 960, 1600] as const;

const RASTER_EXTENSION = /\.(jpe?g|png|webp|gif|avif)$/i;

/** `<fileId>` and file name of a Blob original, or null for anything else. */
function parseMediaUrl(url: string): { fileId: string; fileName: string } | null {
  if (!url || !url.startsWith(`${MEDIA_BASE_URL}/`)) return null;
  const [fileId, fileName, ...rest] = url
    .slice(MEDIA_BASE_URL.length + 1)
    .split(/[?#]/)[0]
    .split("/");
  if (!fileId || !fileName || rest.length > 0 || /^w\d+\.webp$/.test(fileName)) return null;
  return { fileId, fileName };
}

/** True for a Blob original that has resized WebP copies (raster images only). */
export function isMediaImageUrl(url: string): boolean {
  const parsed = parseMediaUrl(url);
  return !!parsed && RASTER_EXTENSION.test(parsed.fileName);
}

/** URL of the smallest stored copy at least `width` wide (the largest if none is). */
export function getMediaVariantUrl(url: string, width: number): string {
  const parsed = parseMediaUrl(url);
  if (!parsed || !RASTER_EXTENSION.test(parsed.fileName)) return url;
  const chosen =
    MEDIA_VARIANT_WIDTHS.find((w) => w >= width) ??
    MEDIA_VARIANT_WIDTHS[MEDIA_VARIANT_WIDTHS.length - 1];
  return `${MEDIA_BASE_URL}/${parsed.fileId}/w${chosen}.webp`;
}

/** True when getOptimizedImageUrl can return something smaller than `url`. */
export function isOptimizableImageUrl(url: string): boolean {
  return isAppwriteUrl(url) || isMediaImageUrl(url);
}

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
 * Extract the file ID from a storage URL:
 *   https://fra.cloud.appwrite.io/v1/storage/buckets/{bucketId}/files/{fileId}/view (or /preview)
 *   {MEDIA_BASE_URL}/{fileId}/{name}   (Blob; migrated files keep their Appwrite id)
 */
export function getFileIdFromUrl(url: string): string | null {
  const media = parseMediaUrl(url);
  if (media) return media.fileId;
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
  quality: number = 80,
): string {
  if (!url) return url;

  // Blob copies keep the original aspect ratio, so height only matters when
  // no width is given; quality was fixed when the copies were made.
  if (isMediaImageUrl(url)) return getMediaVariantUrl(url, width ?? height ?? 960);
  // Other Blob files (SVG, PDF, video) have no copies; serve them as they are.
  if (parseMediaUrl(url)) return url;

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
    thumbnail: getOptimizedImageUrl(url, IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height),
    card: getOptimizedImageUrl(url, IMAGE_SIZES.card.width, IMAGE_SIZES.card.height),
    blog: getOptimizedImageUrl(url, IMAGE_SIZES.blog.width, IMAGE_SIZES.blog.height),
    hero: getOptimizedImageUrl(url, IMAGE_SIZES.hero.width, IMAGE_SIZES.hero.height),
    full: getOptimizedImageUrl(url, IMAGE_SIZES.full.width, IMAGE_SIZES.full.height),
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
  sizes: number[] = [320, 640, 768, 1024, 1280, 1920],
): string {
  if (isMediaImageUrl(url)) {
    return MEDIA_VARIANT_WIDTHS.map((w) => `${getMediaVariantUrl(url, w)} ${w}w`).join(", ");
  }
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
  displayType: "thumbnail" | "card" | "blog" | "hero" | "full" = "card",
): string {
  if (!url) return url;

  const size = IMAGE_SIZES[displayType];
  return getOptimizedImageUrl(url, size.width, size.height);
}
