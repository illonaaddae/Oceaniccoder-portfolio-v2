import { describe, expect, it } from "vitest";
import { getVideoEmbedUrl, getYouTubeId, isDirectVideoUrl, isEmbedVideoUrl } from "./videoUrl";

const APPWRITE_VIEW =
  "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/6abec300002707850abf/view?project=6943431e00253c8f9883";

describe("isDirectVideoUrl", () => {
  it("accepts file URLs with a video extension", () => {
    expect(isDirectVideoUrl("https://cdn.example.com/demo.mp4")).toBe(true);
    expect(isDirectVideoUrl("https://cdn.example.com/demo.webm?v=2")).toBe(true);
    expect(isDirectVideoUrl("https://cdn.example.com/demo.OGG")).toBe(true);
  });

  it("accepts an Appwrite storage view URL, which carries no extension", () => {
    expect(isDirectVideoUrl(APPWRITE_VIEW)).toBe(true);
  });

  it("rejects embeds and pages", () => {
    expect(isDirectVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(false);
    expect(isDirectVideoUrl("https://www.loom.com/share/abc123")).toBe(false);
    expect(isDirectVideoUrl("https://example.com/watch")).toBe(false);
  });
});

describe("isEmbedVideoUrl", () => {
  it("accepts YouTube and Loom", () => {
    expect(isEmbedVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isEmbedVideoUrl("https://www.loom.com/share/abc123")).toBe(true);
  });

  it("rejects hosted files", () => {
    expect(isEmbedVideoUrl(APPWRITE_VIEW)).toBe(false);
  });
});

describe("getYouTubeId", () => {
  it("reads the id from every supported URL shape", () => {
    expect(getYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=xyz")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for other URLs", () => {
    expect(getYouTubeId("https://example.com/video")).toBeNull();
  });
});

describe("getVideoEmbedUrl", () => {
  it("builds a no-cookie YouTube player URL", () => {
    expect(getVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?modestbranding=1&rel=0&playsinline=1",
    );
  });

  it("builds a muted, looping, chrome-free preview when asked", () => {
    expect(getVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ", { preview: true })).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&controls=0&loop=1&playlist=dQw4w9WgXcQ&modestbranding=1&rel=0&playsinline=1",
    );
  });

  it("builds a Loom embed URL", () => {
    expect(getVideoEmbedUrl("https://www.loom.com/share/abc123")).toBe(
      "https://www.loom.com/embed/abc123",
    );
    expect(getVideoEmbedUrl("https://www.loom.com/share/abc123", { preview: true })).toBe(
      "https://www.loom.com/embed/abc123?autoplay=1&hide_controls=1",
    );
  });

  it("returns null for hosted files", () => {
    expect(getVideoEmbedUrl(APPWRITE_VIEW)).toBeNull();
  });
});
