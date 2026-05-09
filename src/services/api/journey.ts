import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Journey } from "../../types";

export async function getJourney(): Promise<Journey[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.JOURNEY,
    [Query.orderAsc("order")],
  );
  return response.documents as unknown as Journey[];
}

export async function createJourney(
  journey: Omit<Journey, "$id">,
): Promise<Journey> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.JOURNEY,
    ID.unique(),
    journey as Record<string, unknown>,
  ) as unknown as Journey;
}

export async function updateJourney(
  journeyId: string,
  journey: Partial<Omit<Journey, "$id">>,
): Promise<Journey> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.JOURNEY,
    journeyId,
    journey as Record<string, unknown>,
  ) as unknown as Journey;
}

export async function deleteJourney(journeyId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.JOURNEY, journeyId);
}
