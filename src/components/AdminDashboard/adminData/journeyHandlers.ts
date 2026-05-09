import type { Journey } from "@/types";
import { createJourney, updateJourney, deleteJourney } from "@/services/api";
import type { LoadDataFn } from "./types";

export function createJourneyHandlers(loadData: LoadDataFn) {
  const handleAddJourney = async (journeyForm: Omit<Journey, "$id">) => {
    try {
      await createJourney(journeyForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add journey:", err);
      throw err;
    }
  };

  const handleUpdateJourney = async (
    journeyId: string,
    journeyForm: Partial<Omit<Journey, "$id">>,
  ) => {
    try {
      await updateJourney(journeyId, journeyForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update journey:", err);
      throw err;
    }
  };

  const handleDeleteJourney = async (journeyId: string) => {
    try {
      await deleteJourney(journeyId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete journey:", err);
      throw err;
    }
  };

  return { handleAddJourney, handleUpdateJourney, handleDeleteJourney };
}
