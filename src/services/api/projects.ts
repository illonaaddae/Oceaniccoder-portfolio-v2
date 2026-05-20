import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Project } from "../../types";

// Strip fields the Appwrite "projects" collection doesn't have. The collection
// hit the per-row attribute-size cap, so demoVideoUrl was never created — yet
// the Project type still carries it for UI display via fallback sources.
// Also drop Appwrite system fields ($id, $createdAt, etc.) which the SDK
// rejects on writes.
function stripUnknownAttrs(data: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set([
    "demoVideoUrl",
    "$id",
    "$createdAt",
    "$updatedAt",
    "$permissions",
    "$databaseId",
    "$collectionId",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!blocked.has(k)) out[k] = v;
  }
  return out;
}

export async function getProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS, [
    Query.orderDesc("$createdAt"),
  ]);
  return response.documents as unknown as Project[];
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS, [
    Query.equal("featured", true),
  ]);
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
    stripUnknownAttrs(project as Record<string, unknown>),
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
    stripUnknownAttrs(project as Record<string, unknown>),
  ) as unknown as Project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);
}
