import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Project } from "../../types";

export async function getProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    [Query.orderDesc("$createdAt")],
  );
  return response.documents as unknown as Project[];
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    [Query.equal("featured", true)],
  );
  return response.documents as unknown as Project[];
}

export async function getProjectById(projectId: string): Promise<Project> {
  return databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId,
  ) as unknown as Promise<Project>;
}

export async function createProject(
  project: Omit<Project, "$id" | "$createdAt">,
): Promise<Project> {
  const result = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    ID.unique(),
    project as Record<string, unknown>,
  );
  return result as unknown as Project;
}

export async function updateProject(
  projectId: string,
  project: Partial<Omit<Project, "$id" | "$createdAt">>,
): Promise<Project> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId,
    project as Record<string, unknown>,
  ) as unknown as Project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);
}
