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

  it("leaves an Appwrite URL as it is: nothing resizes it after the cutover", () => {
    expect(getOptimizedImageUrl(APPWRITE_VIEW_URL, 400, 300)).toBe(APPWRITE_VIEW_URL);
  });
});

describe("getResponsiveImageUrls", () => {
  const PNG = `${MEDIA_BASE_URL}/69444cfb0020fb902f77/portfolio-v2-jpg.png`;

  it("returns all five size variants plus original", () => {
    const urls = getResponsiveImageUrls(PNG);
    expect(urls.thumbnail).toMatch(/\/w480\.webp$/);
    expect(urls.hero).toMatch(/\/w1600\.webp$/);
    expect(urls.full).toMatch(/\/w1600\.webp$/);
    expect(urls.original).toBe(PNG);
  });
});

describe("generateSrcSet", () => {
  it("returns empty string for URLs that are not Blob images", () => {
    expect(generateSrcSet(EXTERNAL_URL)).toBe("");
    expect(generateSrcSet(APPWRITE_VIEW_URL)).toBe("");
  });
});

describe("getImageForContext", () => {
  it("returns empty string for empty input", () => {
    expect(getImageForContext("")).toBe("");
  });

  it("returns external URL unchanged", () => {
    expect(getImageForContext(EXTERNAL_URL, "card")).toBe(EXTERNAL_URL);
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

  it("treats only Blob raster images as optimizable", () => {
    expect(isOptimizableImageUrl(APPWRITE_VIEW_URL)).toBe(false);
    expect(isOptimizableImageUrl(PNG)).toBe(true);
    expect(isOptimizableImageUrl(SVG)).toBe(false);
  });
});
