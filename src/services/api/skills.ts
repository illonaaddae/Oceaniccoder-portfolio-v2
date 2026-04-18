import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Skill } from "../../types";

export async function getSkills(): Promise<Skill[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SKILLS,
    [Query.limit(200)],
  );
  return response.documents as unknown as Skill[];
}

export async function createSkill(
  skill: Omit<Skill, "$id" | "$createdAt">,
): Promise<Skill> {
  const result = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SKILLS,
    ID.unique(),
    skill as Record<string, unknown>,
  );
  return result as unknown as Skill;
}

export async function updateSkill(
  skillId: string,
  skill: Partial<Omit<Skill, "$id" | "$createdAt">>,
): Promise<Skill> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SKILLS,
    skillId,
    skill as Record<string, unknown>,
  ) as unknown as Skill;
}

export async function deleteSkill(skillId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SKILLS, skillId);
}
