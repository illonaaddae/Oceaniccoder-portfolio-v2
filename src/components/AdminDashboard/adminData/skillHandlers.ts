import type { Skill } from "@/types";
import { createSkill, updateSkill, deleteSkill } from "@/services/api";
import type { LoadDataFn } from "./types";

export function createSkillHandlers(loadData: LoadDataFn) {
  const handleAddSkill = async (
    skillForm: Omit<Skill, "$id" | "$createdAt">,
  ) => {
    try {
      await createSkill(skillForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add skill:", err);
      throw err;
    }
  };

  const handleUpdateSkill = async (
    skillId: string,
    skillForm: Partial<Omit<Skill, "$id" | "$createdAt">>,
  ) => {
    try {
      await updateSkill(skillId, skillForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update skill:", err);
      throw err;
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      await deleteSkill(skillId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete skill:", err);
      throw err;
    }
  };

  return { handleAddSkill, handleUpdateSkill, handleDeleteSkill };
}
