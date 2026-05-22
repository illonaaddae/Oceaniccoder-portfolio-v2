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
  IMAGE_SIZES,
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
