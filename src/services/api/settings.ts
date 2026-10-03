import { Permission, Role } from "appwrite";
import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Settings } from "../../types";
import { listRows, usesCosmos } from "./dataApi";

/**
 * Settings the public site reads. The collection itself is admin-read only
 * (it also holds private rows), with document security on, so each public row
 * carries its own read("any"). Without it, visitors silently get the bundled
 * defaults and only a signed-in admin sees the dashboard values.
 */
const PUBLIC_SETTING_KEYS = new Set(["platform_logos", "hero_roles", "hero_images"]);

export async function getSetting(key: string): Promise<Settings | null> {
  const response = usesCosmos
    ? await listRows(COLLECTIONS.SETTINGS, { where: { key } })
    : await databases.listDocuments(DATABASE_ID, COLLECTIONS.SETTINGS, [Query.equal("key", key)]);
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

  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SETTINGS,
    ID.unique(),
    { key, value },
    PUBLIC_SETTING_KEYS.has(key) ? [Permission.read(Role.any())] : undefined,
  ) as unknown as Settings;
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
