import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Settings } from "../../types";

export async function getSetting(key: string): Promise<Settings | null> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SETTINGS, [
    Query.equal("key", key),
  ]);
  if (response.documents.length > 0) {
    return response.documents[0] as unknown as Settings;
  }
  return null;
}

export async function setSetting(key: string, value: string): Promise<Settings> {
  const existing = await getSetting(key);

  if (existing) {
    return databases.updateDocument(DATABASE_ID, COLLECTIONS.SETTINGS, existing.$id, {
      value,
    }) as unknown as Settings;
  }

  return databases.createDocument(DATABASE_ID, COLLECTIONS.SETTINGS, ID.unique(), {
    key,
    value,
  }) as unknown as Settings;
}

const PLATFORM_LOGOS_KEY = "platform_logos";

export async function getPlatformLogoOverrides(): Promise<Record<string, string>> {
  try {
    const setting = await getSetting(PLATFORM_LOGOS_KEY);
    if (!setting?.value) return {};
    return JSON.parse(setting.value) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function setPlatformLogoUrl(platformName: string, url: string): Promise<void> {
  const current = await getPlatformLogoOverrides();
  current[platformName] = url;
  await setSetting(PLATFORM_LOGOS_KEY, JSON.stringify(current));
}

// ── Hero profile images (light/dark) — editable from the dashboard ──────────────
const HERO_IMAGES_KEY = "hero_images";

export interface HeroImages {
  light?: string;
  dark?: string;
}

export async function getHeroImages(): Promise<HeroImages> {
  try {
    const setting = await getSetting(HERO_IMAGES_KEY);
    if (!setting?.value) return {};
    return JSON.parse(setting.value) as HeroImages;
  } catch {
    return {};
  }
}

export async function setHeroImage(mode: "light" | "dark", url: string): Promise<void> {
  const current = await getHeroImages();
  current[mode] = url;
  await setSetting(HERO_IMAGES_KEY, JSON.stringify(current));
}
