import type { Education } from "@/types";
import {
  createEducation,
  updateEducation,
  deleteEducation,
} from "@/services/api";
import type { LoadDataFn } from "./types";

export function createEducationHandlers(loadData: LoadDataFn) {
  const handleAddEducation = async (eduForm: Omit<Education, "$id">) => {
    try {
      await createEducation(eduForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add education:", err);
      throw err;
    }
  };

  const handleUpdateEducation = async (
    eduId: string,
    eduForm: Partial<Omit<Education, "$id">>,
  ) => {
    try {
      await updateEducation(eduId, eduForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update education:", err);
      throw err;
    }
  };

  const handleDeleteEducation = async (eduId: string) => {
    try {
      await deleteEducation(eduId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete education:", err);
      throw err;
    }
  };

  return { handleAddEducation, handleUpdateEducation, handleDeleteEducation };
}
