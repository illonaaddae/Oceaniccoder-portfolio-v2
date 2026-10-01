import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getHeroImages = vi.fn();
vi.mock("@/services/api/settings", () => ({
  getHeroImages: (...a) => getHeroImages(...a),
}));

const { useHeroImages, HERO_IMAGES_CACHE_KEY, HERO_IMAGES_TIMEOUT_MS } =
  await import("./useHeroImages");

function Consumer() {
  const { images, ready } = useHeroImages();
  return (
    <div data-testid="state">{`${ready ? "ready" : "waiting"}|${images.light}|${images.dark}`}</div>
  );
}

const shown = () => screen.getByTestId("state").textContent;
const pending = () => new Promise(() => {});

describe("useHeroImages", () => {
  beforeEach(() => {
    getHeroImages.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("waits for settings instead of showing a default on a first visit", async () => {
    let resolveImages;
    getHeroImages.mockReturnValue(
      new Promise((resolve) => {
        resolveImages = resolve;
      }),
    );
    render(<Consumer />);
    expect(shown()).toBe("waiting||");

    await act(async () => resolveImages({ light: "/new-light.webp", dark: "/new-dark.webp" }));
    expect(shown()).toBe("ready|/new-light.webp|/new-dark.webp");
  });

  it("renders the cached images immediately on a repeat visit", () => {
    localStorage.setItem(
      HERO_IMAGES_CACHE_KEY,
      JSON.stringify({ light: "/cached-light.webp", dark: "/cached-dark.webp" }),
    );
    getHeroImages.mockReturnValue(pending());
    render(<Consumer />);
    expect(shown()).toBe("ready|/cached-light.webp|/cached-dark.webp");
  });

  it("caches what settings return for the next visit", async () => {
    getHeroImages.mockResolvedValue({ light: "/new-light.webp" });
    render(<Consumer />);
    await waitFor(() => expect(shown()).toBe("ready|/new-light.webp|"));
    expect(JSON.parse(localStorage.getItem(HERO_IMAGES_CACHE_KEY))).toEqual({
      light: "/new-light.webp",
      dark: "",
    });
  });

  it("replaces a stale cache once settings answer", async () => {
    localStorage.setItem(HERO_IMAGES_CACHE_KEY, JSON.stringify({ light: "/old.webp", dark: "" }));
    getHeroImages.mockResolvedValue({ light: "/new.webp" });
    render(<Consumer />);
    await waitFor(() => expect(shown()).toBe("ready|/new.webp|"));
  });

  it("falls back to the defaults if settings never answer", () => {
    vi.useFakeTimers();
    getHeroImages.mockReturnValue(pending());
    render(<Consumer />);
    expect(shown()).toBe("waiting||");
    act(() => vi.advanceTimersByTime(HERO_IMAGES_TIMEOUT_MS));
    expect(shown()).toBe("ready||");
  });

  it("ignores a corrupt cache entry", () => {
    localStorage.setItem(HERO_IMAGES_CACHE_KEY, "{not json");
    getHeroImages.mockReturnValue(pending());
    render(<Consumer />);
    expect(shown()).toBe("waiting||");
  });
});
