import { COLLECTIONS } from "./collections";
import type { Journey } from "../../types";
import { listRows, manageCreate, manageDelete, manageUpdate } from "./dataApi";

export async function getJourney(): Promise<Journey[]> {
  const response = await listRows(COLLECTIONS.JOURNEY, { orderBy: "order" });
  return response.documents as unknown as Journey[];
}

export async function createJourney(journey: Omit<Journey, "$id">): Promise<Journey> {
  return manageCreate<Journey>(COLLECTIONS.JOURNEY, journey);
}

export async function updateJourney(
  journeyId: string,
  journey: Partial<Omit<Journey, "$id">>,
): Promise<Journey> {
  return manageUpdate<Journey>(COLLECTIONS.JOURNEY, journeyId, journey);
}

export async function deleteJourney(journeyId: string): Promise<void> {
  await manageDelete(COLLECTIONS.JOURNEY, journeyId);
}
