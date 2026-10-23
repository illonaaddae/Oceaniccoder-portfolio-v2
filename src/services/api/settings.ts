import { COLLECTIONS } from "./collections";
import type { Settings } from "../../types";
import { listRows, manageCreate, manageUpdate } from "./dataApi";

export async function getSetting(key: string): Promise<Settings | null> {
  const response = await listRows<Settings>(COLLECTIONS.SETTINGS, { where: { key } });
  return response.documents[0] ?? null;
}

/**
 * Creates or updates a setting. Which keys visitors can read is decided on the
 * server (MIGRATED_SETTINGS_KEYS in api/shared/cosmos.js), not per row.
 */
export async function setSetting(key: string, value: string): Promise<Settings> {
  const existing = await getSetting(key);
  if (existing) return manageUpdate<Settings>(COLLECTIONS.SETTINGS, existing.$id, { value });
  return manageCreate<Settings>(COLLECTIONS.SETTINGS, { key, value });
}

const PLATFORM_LOGOS_KEY = "platform_logos";

/**
 * A setting stored as a JSON object of URLs. Rejects when the row can't be
 * read or holds anything else; no row reads as {}.
 */
async function readUrlMapSetting(key: string): Promise<Record<string, string>> {
  const setting = await getSetting(key);
  if (!setting?.value) return {};
  const parsed: unknown = JSON.parse(setting.value);
  const isUrlMap =
    typeof parsed === "object" &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    Object.values(parsed).every((url) => typeof url === "string");
  if (!isUrlMap) throw new Error(`${key} setting is not an object of URLs`);
  return parsed as Record<string, string>;
}

/**
 * The saved platform logo URLs. Rejects when the row can't be read or holds
 * something other than an object of URLs, for callers that must not mistake a
 * failed read for "no overrides" (Storage Cleanup decides what to delete).
 */
export async function readPlatformLogoOverrides(): Promise<Record<string, string>> {
  return readUrlMapSetting(PLATFORM_LOGOS_KEY);
}

/** Like readPlatformLogoOverrides, but falls back to {} so logos still render. */
export async function getPlatformLogoOverrides(): Promise<Record<string, string>> {
  try {
    return await readPlatformLogoOverrides();
  } catch {
    return {};
  }
}

/**
 * Saves one platform's logo into the overrides. Rejects without saving if the
 * current overrides can't be read, since saving {} plus this logo would wipe
 * the others.
 */
export async function setPlatformLogoUrl(platformName: string, url: string): Promise<void> {
  let current: Record<string, string>;
  try {
    current = await readPlatformLogoOverrides();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Couldn't read the saved platform logos, so nothing was saved: ${reason}`);
  }
  current[platformName] = url;
  await setSetting(PLATFORM_LOGOS_KEY, JSON.stringify(current));
}

// ── Hero profile images (light/dark) — editable from the dashboard ──────────────
const HERO_IMAGES_KEY = "hero_images";

export interface HeroImages {
  light?: string;
  dark?: string;
}

/**
 * The saved hero images. Rejects when the row can't be read or is malformed,
 * for callers that must not mistake a failed read for "no images".
 */
export async function readHeroImages(): Promise<HeroImages> {
  return readUrlMapSetting(HERO_IMAGES_KEY);
}

/** Like readHeroImages, but falls back to {} so the hero still renders. */
export async function getHeroImages(): Promise<HeroImages> {
  try {
    return await readHeroImages();
  } catch {
    return {};
  }
}

/**
 * Saves one theme's hero image. Rejects without saving if the current images
 * can't be read, since saving {} plus this image would wipe the other theme.
 */
export async function setHeroImage(mode: "light" | "dark", url: string): Promise<void> {
  let current: HeroImages;
  try {
    current = await readHeroImages();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Couldn't read the saved hero images, so nothing was saved: ${reason}`);
  }
  current[mode] = url;
  await setSetting(HERO_IMAGES_KEY, JSON.stringify(current));
}

// ── Hero typewriter roles — the rotating titles under the hero name ────────────
const HERO_ROLES_KEY = "hero_roles";

/**
 * The roles the hero cycles through. Returns an empty array when unset so the
 * caller can fall back to the bundled defaults rather than showing nothing.
 */
export async function getHeroRoles(): Promise<string[]> {
  try {
    const setting = await getSetting(HERO_ROLES_KEY);
    if (!setting?.value) return [];
    const parsed = JSON.parse(setting.value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is string => typeof r === "string" && r.trim() !== "");
  } catch {
    return [];
  }
}

export async function setHeroRoles(roles: string[]): Promise<void> {
  const cleaned = roles.map((r) => r.trim()).filter(Boolean);
  await setSetting(HERO_ROLES_KEY, JSON.stringify(cleaned));
}
