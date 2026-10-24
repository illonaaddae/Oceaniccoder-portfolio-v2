import { COLLECTIONS } from "./collections";
import type { Skill } from "../../types";
import { listRows, manageCreate, manageDelete, manageUpdate } from "./dataApi";

export async function getSkills(): Promise<Skill[]> {
  const response = await listRows(COLLECTIONS.SKILLS, { limit: 200 });
  return response.documents as unknown as Skill[];
}

export async function createSkill(skill: Omit<Skill, "$id" | "$createdAt">): Promise<Skill> {
  return manageCreate<Skill>(COLLECTIONS.SKILLS, skill);
}

export async function updateSkill(
  skillId: string,
  skill: Partial<Omit<Skill, "$id" | "$createdAt">>,
): Promise<Skill> {
  return manageUpdate<Skill>(COLLECTIONS.SKILLS, skillId, skill);
}

export async function deleteSkill(skillId: string): Promise<void> {
  await manageDelete(COLLECTIONS.SKILLS, skillId);
}
