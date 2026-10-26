import { COLLECTIONS } from "./collections";
import type { About } from "../../types";
import { listRows, manageCreate, manageUpdate } from "./dataApi";

export async function getAbout(): Promise<About | null> {
  try {
    const response = await listRows(COLLECTIONS.ABOUT);
    return response.documents.length > 0 ? (response.documents[0] as unknown as About) : null;
  } catch {
    return null;
  }
}

export async function createAbout(about: Omit<About, "$id">): Promise<About> {
  return manageCreate<About>(COLLECTIONS.ABOUT, about);
}

export async function updateAbout(
  aboutId: string,
  about: Partial<Omit<About, "$id">>,
): Promise<About> {
  return manageUpdate<About>(COLLECTIONS.ABOUT, aboutId, about);
}

export async function saveAbout(
  about: Partial<Omit<About, "$id">> & { $id?: string },
): Promise<About> {
  const existing = await getAbout();
  if (existing) return updateAbout(existing.$id, about);
  return createAbout(about as Omit<About, "$id">);
}
