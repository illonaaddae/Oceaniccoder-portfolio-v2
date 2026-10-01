import { useEffect, useState } from "react";
import { getHeroImages } from "@/services/api/settings";

export const HERO_IMAGES_CACHE_KEY = "oc:hero-images";

/** How long a first visit waits for settings before showing the bundled default. */
export const HERO_IMAGES_TIMEOUT_MS = 3000;

const EMPTY = { light: "", dark: "" };

const normalize = (imgs) => ({ light: imgs?.light ?? "", dark: imgs?.dark ?? "" });

function readCache() {
  try {
    const raw = localStorage.getItem(HERO_IMAGES_CACHE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(images) {
  try {
    localStorage.setItem(HERO_IMAGES_CACHE_KEY, JSON.stringify(images));
  } catch {
    // Storage blocked (private mode, quota) — the next visit just waits again.
  }
}

/**
 * Hero portraits managed from the dashboard (About Me → Hero Images).
 *
 * Unlike the typewriter roles, the portrait must not start on the bundled
 * default: that painted the old photo and then swapped in the new one when
 * settings arrived. Instead it reports `ready: false` until it knows which
 * image to show. Repeat visits read the last answer from localStorage and are
 * ready on first paint; the request still runs and refreshes the cache, so a
 * dashboard change shows on the visit after it lands. Empty strings mean "use
 * the bundled default".
 */
export function useHeroImages() {
  const [cached] = useState(readCache);
  const [images, setImages] = useState(cached ?? EMPTY);
  const [ready, setReady] = useState(cached !== null);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (active) setReady(true);
    }, HERO_IMAGES_TIMEOUT_MS);

    getHeroImages()
      .then((imgs) => {
        if (!active) return;
        const next = normalize(imgs);
        writeCache(next);
        setImages(next);
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);

  return { images, ready };
}
