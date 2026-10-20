import { describe, it, expect } from "vitest";
import { IMAGES } from "./imageUrls";
import { getFileIdFromUrl } from "./imageOptimizer";

// Every media file id in src/ code must be in IMAGES. Storage Cleanup counts
// IMAGES as in use, so a file named only elsewhere in the code would look
// orphaned there and could be deleted from under the live site.
const sources = import.meta.glob<string>(
  ["/src/**/*.{ts,tsx,js,jsx}", "!/src/**/*.test.*", "!/src/**/__tests__/**"],
  { query: "?raw", import: "default", eager: true },
);

// A literal file id after the Blob host, after MEDIA_BASE_URL, or in a
// media("<id>/...") path. Ids built at runtime (`${fileId}`) are not literals.
const FILE_ID = "([A-Za-z0-9][\\w.-]*)";
const MEDIA_ID_PATTERNS = [
  new RegExp(`blob\\.core\\.windows\\.net/media/${FILE_ID}`, "g"),
  new RegExp(`\\$\\{MEDIA_BASE_URL\\}/${FILE_ID}`, "g"),
  new RegExp(`\\bmedia\\("${FILE_ID}/`, "g"),
];

function mediaIdsIn(source: string): string[] {
  return MEDIA_ID_PATTERNS.flatMap((pattern) => [...source.matchAll(pattern)].map((m) => m[1]));
}

describe("IMAGES", () => {
  const bundledIds = new Set(Object.values(IMAGES).map((url) => getFileIdFromUrl(url)));

  it("gives every bundled image a media file id", () => {
    expect(bundledIds.has(null)).toBe(false);
  });

  it("holds every media file the code refers to", () => {
    const found = Object.entries(sources).flatMap(([path, source]) =>
      mediaIdsIn(source).map((id) => ({ path, id })),
    );
    // Guards the patterns themselves: imageUrls.ts alone has many matches.
    expect(found.length).toBeGreaterThanOrEqual(Object.keys(IMAGES).length);

    const missing = found.filter(({ id }) => !bundledIds.has(id));
    expect(missing).toEqual([]);
  });
});
