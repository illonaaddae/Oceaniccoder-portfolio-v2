// Project Videos API — separate collection for demoVideoUrl per project.
//
// Why a separate collection: the `projects` collection hit its row-size cap,
// so demoVideoUrl couldn't be added as a column there. This collection holds
// { projectId, demoVideoUrl } pairs. Joined into Project objects on read by
// getProjects() in projects.ts.
//
// Constraints:
// - projectId is required (FK to projects.$id) — unique index ensures one video per project
// - demoVideoUrl is required URL (Appwrite url-type validation)
import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";

export interface ProjectVideo {
  $id: string;
  projectId: string;
  demoVideoUrl: string;
}

export async function getProjectVideos(): Promise<ProjectVideo[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_VIDEOS, [
    Query.limit(100),
  ]);
  return response.documents as unknown as ProjectVideo[];
}

// Build a {projectId -> demoVideoUrl} map for joining into Project list.
export async function getProjectVideoMap(): Promise<Record<string, string>> {
  const videos = await getProjectVideos();
  const map: Record<string, string> = {};
  for (const v of videos) map[v.projectId] = v.demoVideoUrl;
  return map;
}

export async function getProjectVideo(projectId: string): Promise<ProjectVideo | null> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_VIDEOS, [
    Query.equal("projectId", projectId),
    Query.limit(1),
  ]);
  return (response.documents[0] as unknown as ProjectVideo) ?? null;
}

// Upsert pattern: empty string deletes existing row, non-empty creates or updates.
export async function setProjectVideo(projectId: string, demoVideoUrl: string): Promise<void> {
  const existing = await getProjectVideo(projectId);
  if (!demoVideoUrl) {
    if (existing) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_VIDEOS, existing.$id);
    }
    return;
  }
  if (existing) {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECT_VIDEOS, existing.$id, {
      demoVideoUrl,
    });
  } else {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.PROJECT_VIDEOS, ID.unique(), {
      projectId,
      demoVideoUrl,
    });
  }
}

export async function deleteProjectVideo(projectId: string): Promise<void> {
  const existing = await getProjectVideo(projectId);
  if (existing) {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_VIDEOS, existing.$id);
  }
}
