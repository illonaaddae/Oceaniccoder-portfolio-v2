import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Project } from "../../types";
import { getProjectVideoMap, setProjectVideo, deleteProjectVideo } from "./projectVideos";

// Strip fields the Appwrite "projects" collection doesn't have. The collection
// hit the per-row attribute-size cap, so demoVideoUrl is stored in a separate
// `project_videos` collection (see projectVideos.ts). We split writes — the
// demoVideoUrl field goes there, everything else goes to projects.
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

// Merge demoVideoUrl from project_videos collection into the project list.
async function joinVideos(projects: Project[]): Promise<Project[]> {
  try {
    const map = await getProjectVideoMap();
    return projects.map((p) => (map[p.$id] ? { ...p, demoVideoUrl: map[p.$id] } : p));
  } catch {
    // If videos collection is unreachable, return projects without the join.
    return projects;
  }
}

export async function getProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS, [
    Query.orderDesc("$createdAt"),
  ]);
  const projects = response.documents as unknown as Project[];
  return joinVideos(projects);
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS, [
    Query.equal("featured", true),
  ]);
  const projects = response.documents as unknown as Project[];
  return joinVideos(projects);
}

export async function getProjectById(projectId: string): Promise<Project> {
  const doc = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId,
  )) as unknown as Project;
  const joined = await joinVideos([doc]);
  return joined[0];
}

export async function createProject(
  project: Omit<Project, "$id" | "$createdAt">,
): Promise<Project> {
  const result = (await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    ID.unique(),
    stripUnknownAttrs(project as Record<string, unknown>),
  )) as unknown as Project;

  // Write demoVideoUrl to side collection if provided.
  if (project.demoVideoUrl) {
    try {
      await setProjectVideo(result.$id, project.demoVideoUrl);
      result.demoVideoUrl = project.demoVideoUrl;
    } catch (err) {
      console.error("Failed to save project video:", err);
    }
  }
  return result;
}

export async function updateProject(
  projectId: string,
  project: Partial<Omit<Project, "$id" | "$createdAt">>,
): Promise<Project> {
  const result = (await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId,
    stripUnknownAttrs(project as Record<string, unknown>),
  )) as unknown as Project;

  // demoVideoUrl is intentional control: undefined means "leave alone",
  // empty string means "delete existing video row", non-empty means "upsert".
  if (project.demoVideoUrl !== undefined) {
    try {
      await setProjectVideo(projectId, project.demoVideoUrl);
      result.demoVideoUrl = project.demoVideoUrl || undefined;
    } catch (err) {
      console.error("Failed to update project video:", err);
    }
  }
  return result;
}

export async function deleteProject(projectId: string): Promise<void> {
  // Best-effort cascade: remove video row first so admin sees no orphaned rows.
  try {
    await deleteProjectVideo(projectId);
  } catch (err) {
    console.error("Failed to cascade delete project video:", err);
  }
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);
}
