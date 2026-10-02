/**
 * Image Optimizer Tests
 * @module utils/imageOptimizer.test
 */

import { describe, it, expect } from "vitest";
import {
  isAppwriteUrl,
  getFileIdFromUrl,
  getOptimizedImageUrl,
  getResponsiveImageUrls,
  generateSrcSet,
  getImageForContext,
  getMediaVariantUrl,
  isMediaImageUrl,
  isOptimizableImageUrl,
  IMAGE_SIZES,
  MEDIA_BASE_URL,
} from "./imageOptimizer";

const APPWRITE_VIEW_URL =
  "https://fra.cloud.appwrite.io/v1/storage/buckets/abc123/files/file-id-xyz/view";
const APPWRITE_PREVIEW_URL =
  "https://fra.cloud.appwrite.io/v1/storage/buckets/abc123/files/file-id-xyz/preview";
const EXTERNAL_URL = "https://cdn.example.com/images/photo.jpg";

describe("isAppwriteUrl", () => {
  it("identifies Appwrite Storage view URLs", () => {
    expect(isAppwriteUrl(APPWRITE_VIEW_URL)).toBe(true);
  });

  it("identifies Appwrite Storage preview URLs", () => {
    expect(isAppwriteUrl(APPWRITE_PREVIEW_URL)).toBe(true);
  });

  it("rejects non-Appwrite (CDN) URLs", () => {
    expect(isAppwriteUrl(EXTERNAL_URL)).toBe(false);
  });

  it("rejects Appwrite-domain URLs that are not storage", () => {
    expect(isAppwriteUrl("https://fra.cloud.appwrite.io/v1/account")).toBe(false);
  });

  it("returns falsy for empty input", () => {
    expect(isAppwriteUrl("")).toBeFalsy();
  });
});

describe("getFileIdFromUrl", () => {
  it("extracts file ID from /view URL", () => {
    expect(getFileIdFromUrl(APPWRITE_VIEW_URL)).toBe("file-id-xyz");
  });

  it("extracts file ID from /preview URL", () => {
    expect(getFileIdFromUrl(APPWRITE_PREVIEW_URL)).toBe("file-id-xyz");
  });

  it("extracts file ID when URL has query string", () => {
    const url = `${APPWRITE_VIEW_URL}?project=foo`;
    expect(getFileIdFromUrl(url)).toBe("file-id-xyz");
  });

  it("returns null for non-Appwrite URLs", () => {
    expect(getFileIdFromUrl(EXTERNAL_URL)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getFileIdFromUrl("")).toBeNull();
  });

  it("returns null for malformed URL", () => {
    expect(getFileIdFromUrl("https://appwrite.io/storage/garbage")).toBeNull();
  });
});

describe("getOptimizedImageUrl", () => {
  it("passes through external CDN URLs unchanged", () => {
    expect(getOptimizedImageUrl(EXTERNAL_URL, 400, 300)).toBe(EXTERNAL_URL);
  });

  it("returns the input unchanged when empty string", () => {
    expect(getOptimizedImageUrl("", 400)).toBe("");
  });

  it("builds preview URL with width param for Appwrite URL", () => {
    const result = getOptimizedImageUrl(APPWRITE_VIEW_URL, 400);
    expect(result).toContain("/storage/buckets/");
    expect(result).toContain("/files/file-id-xyz/preview");
    expect(result).toContain("width=400");
  });

  it("includes both width and height when provided", () => {
    const result = getOptimizedImageUrl(APPWRITE_VIEW_URL, 400, 300);
    expect(result).toContain("width=400");
    expect(result).toContain("height=300");
  });

  it("includes default quality of 80", () => {
    const result = getOptimizedImageUrl(APPWRITE_VIEW_URL, 400);
    expect(result).toContain("quality=80");
  });

  it("uses custom quality when provided", () => {
    const result = getOptimizedImageUrl(APPWRITE_VIEW_URL, 400, 300, 50);
    expect(result).toContain("quality=50");
  });

  it("always includes project param", () => {
    const result = getOptimizedImageUrl(APPWRITE_VIEW_URL, 400);
    expect(result).toContain("project=");
  });

  it("omits width param if not provided", () => {
    const result = getOptimizedImageUrl(APPWRITE_VIEW_URL);
    expect(result).not.toContain("width=");
  });

  it("omits height param if not provided", () => {
    const result = getOptimizedImageUrl(APPWRITE_VIEW_URL, 400);
    expect(result).not.toContain("height=");
  });
});

describe("getResponsiveImageUrls", () => {
  it("returns all five size variants plus original", () => {
    const urls = getResponsiveImageUrls(APPWRITE_VIEW_URL);
    expect(urls).toHaveProperty("thumbnail");
    expect(urls).toHaveProperty("card");
    expect(urls).toHaveProperty("blog");
    expect(urls).toHaveProperty("hero");
    expect(urls).toHaveProperty("full");
    expect(urls.original).toBe(APPWRITE_VIEW_URL);
  });

  it("encodes the correct widths per variant", () => {
    const urls = getResponsiveImageUrls(APPWRITE_VIEW_URL);
    expect(urls.thumbnail).toContain(`width=${IMAGE_SIZES.thumbnail.width}`);
    expect(urls.hero).toContain(`width=${IMAGE_SIZES.hero.width}`);
  });
});

describe("generateSrcSet", () => {
  it("returns empty string for non-Appwrite URLs", () => {
    expect(generateSrcSet(EXTERNAL_URL)).toBe("");
  });

  it("generates comma-separated set with width descriptors", () => {
    const result = generateSrcSet(APPWRITE_VIEW_URL, [320, 640]);
    expect(result).toContain("320w");
    expect(result).toContain("640w");
    expect(result.split(", ")).toHaveLength(2);
  });

  it("uses default sizes when none provided", () => {
    const result = generateSrcSet(APPWRITE_VIEW_URL);
    expect(result).toContain("320w");
    expect(result).toContain("1920w");
  });
});

describe("getImageForContext", () => {
  it("returns empty string for empty input", () => {
    expect(getImageForContext("")).toBe("");
  });

  it("returns external URL unchanged", () => {
    expect(getImageForContext(EXTERNAL_URL, "card")).toBe(EXTERNAL_URL);
  });

  it("defaults to 'card' size", () => {
    const result = getImageForContext(APPWRITE_VIEW_URL);
    expect(result).toContain(`width=${IMAGE_SIZES.card.width}`);
    expect(result).toContain(`height=${IMAGE_SIZES.card.height}`);
  });

  it("uses thumbnail size when requested", () => {
    const result = getImageForContext(APPWRITE_VIEW_URL, "thumbnail");
    expect(result).toContain(`width=${IMAGE_SIZES.thumbnail.width}`);
  });

  it("uses hero size when requested", () => {
    const result = getImageForContext(APPWRITE_VIEW_URL, "hero");
    expect(result).toContain(`width=${IMAGE_SIZES.hero.width}`);
  });
});

describe("Azure Blob media URLs", () => {
  const PNG = `${MEDIA_BASE_URL}/69444cfb0020fb902f77/portfolio-v2-jpg.png`;
  const SVG = `${MEDIA_BASE_URL}/69444cef000da2150f34/blog-placeholder-1.svg`;
  const MP4 = `${MEDIA_BASE_URL}/6abebedf0001d5085076/walkthrough.mp4`;
  const VARIANT = `${MEDIA_BASE_URL}/69444cfb0020fb902f77/w480.webp`;

  it("recognises raster originals only", () => {
    expect(isMediaImageUrl(PNG)).toBe(true);
    expect(isMediaImageUrl(SVG)).toBe(false);
    expect(isMediaImageUrl(MP4)).toBe(false);
    expect(isMediaImageUrl(VARIANT)).toBe(false);
    expect(isMediaImageUrl(EXTERNAL_URL)).toBe(false);
  });

  it("picks the smallest stored copy at least as wide as requested", () => {
    const base = `${MEDIA_BASE_URL}/69444cfb0020fb902f77`;
    expect(getMediaVariantUrl(PNG, 150)).toBe(`${base}/w480.webp`);
    expect(getMediaVariantUrl(PNG, 480)).toBe(`${base}/w480.webp`);
    expect(getMediaVariantUrl(PNG, 800)).toBe(`${base}/w960.webp`);
    expect(getMediaVariantUrl(PNG, 1200)).toBe(`${base}/w1600.webp`);
  });

  it("falls back to the largest copy past the biggest width", () => {
    expect(getMediaVariantUrl(PNG, 1920)).toBe(`${MEDIA_BASE_URL}/69444cfb0020fb902f77/w1600.webp`);
  });

  it("leaves SVG, video and foreign URLs untouched", () => {
    expect(getOptimizedImageUrl(SVG, 400)).toBe(SVG);
    expect(getOptimizedImageUrl(MP4, 400)).toBe(MP4);
    expect(getOptimizedImageUrl(EXTERNAL_URL, 400)).toBe(EXTERNAL_URL);
  });

  it("serves context sizes from the stored copies", () => {
    expect(getImageForContext(PNG, "card")).toMatch(/\/w480\.webp$/);
    expect(getImageForContext(PNG, "hero")).toMatch(/\/w1600\.webp$/);
  });

  it("builds a srcSet from the stored widths", () => {
    expect(generateSrcSet(PNG)).toBe(
      [480, 960, 1600]
        .map((w) => `${MEDIA_BASE_URL}/69444cfb0020fb902f77/w${w}.webp ${w}w`)
        .join(", "),
    );
  });

  it("extracts the file id, which migrated files share with Appwrite", () => {
    expect(getFileIdFromUrl(PNG)).toBe("69444cfb0020fb902f77");
    expect(getFileIdFromUrl(MP4)).toBe("6abebedf0001d5085076");
  });

  it("treats both Appwrite and Blob images as optimizable", () => {
    expect(isOptimizableImageUrl(APPWRITE_VIEW_URL)).toBe(true);
    expect(isOptimizableImageUrl(PNG)).toBe(true);
    expect(isOptimizableImageUrl(SVG)).toBe(false);
  });
});
