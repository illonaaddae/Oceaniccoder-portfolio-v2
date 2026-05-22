import { describe, it, expect, vi } from "vitest";
import {
  isAppwriteUrl,
  getFileIdFromUrl,
  getOptimizedImageUrl,
  getResponsiveImageUrls,
  generateSrcSet,
  getImageForContext,
  IMAGE_SIZES,
} from "./imageOptimizer";

describe("imageOptimizer utilities", () => {
  describe("isAppwriteUrl", () => {
    it("returns true for a valid Appwrite storage URL", () => {
      expect(
        isAppwriteUrl("https://fra.cloud.appwrite.io/v1/storage/buckets/123/files/456/view"),
      ).toBe(true);
    });

    it("returns false for non-Appwrite URLs", () => {
      expect(isAppwriteUrl("https://example.com/image.jpg")).toBe(false);
    });

    it("returns false if /storage/ is missing", () => {
      expect(isAppwriteUrl("https://fra.cloud.appwrite.io/v1/databases/123")).toBe(false);
    });

    it("returns falsy for null, undefined, or empty string", () => {
      expect(isAppwriteUrl(null as any)).toBeFalsy();
      expect(isAppwriteUrl(undefined as any)).toBeFalsy();
      expect(isAppwriteUrl("")).toBeFalsy();
    });
  });

  describe("getFileIdFromUrl", () => {
    it("extracts file ID from a /view URL", () => {
      expect(
        getFileIdFromUrl(
          "https://fra.cloud.appwrite.io/v1/storage/buckets/123/files/test-file-id/view",
        ),
      ).toBe("test-file-id");
    });

    it("extracts file ID from a /preview URL", () => {
      expect(
        getFileIdFromUrl(
          "https://fra.cloud.appwrite.io/v1/storage/buckets/123/files/test-file-id/preview",
        ),
      ).toBe("test-file-id");
    });

    it("returns null for invalid Appwrite URLs", () => {
      expect(getFileIdFromUrl("https://example.com/files/123")).toBe(null);
    });

    it("returns null if file ID cannot be found in the URL", () => {
      expect(
        getFileIdFromUrl("https://fra.cloud.appwrite.io/v1/storage/buckets/123/notfiles/123/view"),
      ).toBe(null);
    });
  });

  describe("getOptimizedImageUrl", () => {
    const mockUrl = "https://fra.cloud.appwrite.io/v1/storage/buckets/123/files/test-file/view";

    it("returns original URL if URL is falsy", () => {
      expect(getOptimizedImageUrl("")).toBe("");
      expect(getOptimizedImageUrl(null as any)).toBe(null);
    });

    it("returns original URL if not an Appwrite URL", () => {
      const nonAppwrite = "https://example.com/img.jpg";
      expect(getOptimizedImageUrl(nonAppwrite)).toBe(nonAppwrite);
    });

    it("generates a preview URL with width and height parameters", () => {
      const result = getOptimizedImageUrl(mockUrl, 100, 200);
      expect(result).toContain("/preview?");
      expect(result).toContain("width=100");
      expect(result).toContain("height=200");
      expect(result).toContain("quality=80"); // Default quality
      expect(result).toContain("project=6943431e00253c8f9883");
    });

    it("generates a preview URL with custom quality", () => {
      const result = getOptimizedImageUrl(mockUrl, undefined, undefined, 50);
      expect(result).toContain("quality=50");
      expect(result).not.toContain("width=");
      expect(result).not.toContain("height=");
    });

    it("falls back to original URL on error during URL generation", () => {
      // Mock URLSearchParams to throw an error
      const originalURLSearchParams = global.URLSearchParams;
      global.URLSearchParams = vi.fn().mockImplementation(() => {
        throw new Error("Mock URLSearchParams error");
      }) as any;

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = getOptimizedImageUrl(mockUrl);

      expect(result).toBe(mockUrl);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to generate optimized image URL:",
        expect.any(Error),
      );

      // Restore mocks
      global.URLSearchParams = originalURLSearchParams;
      consoleSpy.mockRestore();
    });
  });

  describe("getResponsiveImageUrls", () => {
    it("returns an object with responsive URLs for different sizes", () => {
      const mockUrl = "https://fra.cloud.appwrite.io/v1/storage/buckets/123/files/test-file/view";
      const result = getResponsiveImageUrls(mockUrl);

      expect(result.original).toBe(mockUrl);
      expect(result.thumbnail).toContain(`width=${IMAGE_SIZES.thumbnail.width}`);
      expect(result.card).toContain(`width=${IMAGE_SIZES.card.width}`);
      expect(result.blog).toContain(`width=${IMAGE_SIZES.blog.width}`);
      expect(result.hero).toContain(`width=${IMAGE_SIZES.hero.width}`);
      expect(result.full).toContain(`width=${IMAGE_SIZES.full.width}`);
    });
  });

  describe("generateSrcSet", () => {
    it("generates a correct srcSet string for Appwrite URLs with given sizes", () => {
      const mockUrl = "https://fra.cloud.appwrite.io/v1/storage/buckets/123/files/test-file/view";
      const result = generateSrcSet(mockUrl, [100, 200]);

      expect(result).toContain("width=100");
      expect(result).toContain(" 100w");
      expect(result).toContain("width=200");
      expect(result).toContain(" 200w");
      expect(result).toContain(",");
    });

    it("uses default sizes if sizes array is not provided", () => {
      const mockUrl = "https://fra.cloud.appwrite.io/v1/storage/buckets/123/files/test-file/view";
      const result = generateSrcSet(mockUrl);

      // Default sizes are [320, 640, 768, 1024, 1280, 1920]
      expect(result).toContain("320w");
      expect(result).toContain("1920w");
    });

    it("returns an empty string for non-Appwrite URLs", () => {
      expect(generateSrcSet("https://example.com/img.jpg")).toBe("");
    });
  });

  describe("getImageForContext", () => {
    const mockUrl = "https://fra.cloud.appwrite.io/v1/storage/buckets/123/files/test-file/view";

    it("returns an optimized URL for a specific display context", () => {
      const result = getImageForContext(mockUrl, "hero");
      expect(result).toContain(`width=${IMAGE_SIZES.hero.width}`);
      expect(result).toContain(`height=${IMAGE_SIZES.hero.height}`);
    });

    it('uses "card" as the default display context', () => {
      const result = getImageForContext(mockUrl);
      expect(result).toContain(`width=${IMAGE_SIZES.card.width}`);
      expect(result).toContain(`height=${IMAGE_SIZES.card.height}`);
    });

    it("returns empty string if URL is falsy", () => {
      expect(getImageForContext("")).toBe("");
    });
  });
});
