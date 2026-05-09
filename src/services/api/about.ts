import { databases, DATABASE_ID, COLLECTIONS, ID } from "./client";
import type { About } from "../../types";

export async function getAbout(): Promise<About | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ABOUT,
    );
    return response.documents.length > 0
      ? (response.documents[0] as unknown as About)
      : null;
  } catch {
    return null;
  }
}

export async function createAbout(about: Omit<About, "$id">): Promise<About> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.ABOUT,
    ID.unique(),
    about as Record<string, unknown>,
  ) as unknown as About;
}

function handleAttributeError(error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("Unknown attribute") || msg.includes("attribute")) {
    const match = msg.match(/"([^"]+)"/);
    const attr = match ? match[1] : "unknown";
    throw new Error(
      `The attribute "${attr}" doesn't exist in your Appwrite database. ` +
        `Please add it to the "about" collection in Appwrite Console.`,
    );
  }
  throw error;
}

export async function updateAbout(
  aboutId: string,
  about: Partial<Omit<About, "$id">>,
): Promise<About> {
  try {
    return (await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ABOUT,
      aboutId,
      about as Record<string, unknown>,
    )) as unknown as About;
  } catch (error: unknown) {
    handleAttributeError(error);
  }
}

export async function saveAbout(
  about: Partial<Omit<About, "$id">> & { $id?: string },
): Promise<About> {
  const existing = await getAbout();
  if (existing) return updateAbout(existing.$id, about);

  try {
    return await createAbout(about as Omit<About, "$id">);
  } catch (error: unknown) {
    handleAttributeError(error);
  }
}
