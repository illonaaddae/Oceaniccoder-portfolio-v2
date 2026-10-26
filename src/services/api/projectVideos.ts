// Project Videos API — separate collection for demoVideoUrl per project.
//
// Why a separate collection: the `projects` collection hit its row-size cap,
// so demoVideoUrl couldn't be added as a column there. This collection holds
// { projectId, demoVideoUrl } pairs. Joined into Project objects on read by
// getProjects() in projects.ts.
//
// Constraints:
// - projectId is required (FK to projects.$id) — unique index ensures one video per project
// - demoVideoUrl is a required URL
import { COLLECTIONS } from "./collections";
import { listRows, manageCreate, manageDelete, manageUpdate } from "./dataApi";

export interface ProjectVideo {
  $id: string;
  projectId: string;
  demoVideoUrl: string;
}

export async function getProjectVideos(): Promise<ProjectVideo[]> {
  const response = await listRows(COLLECTIONS.PROJECT_VIDEOS, { limit: 100 });
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
  const response = await listRows(COLLECTIONS.PROJECT_VIDEOS, { where: { projectId }, limit: 1 });
  return (response.documents[0] as unknown as ProjectVideo) ?? null;
}

// Upsert pattern: empty string deletes existing row, non-empty creates or updates.
export async function setProjectVideo(projectId: string, demoVideoUrl: string): Promise<void> {
  const existing = await getProjectVideo(projectId);
  if (!demoVideoUrl) {
    if (existing) await manageDelete(COLLECTIONS.PROJECT_VIDEOS, existing.$id);
    return;
  }
  if (existing) {
    await manageUpdate(COLLECTIONS.PROJECT_VIDEOS, existing.$id, { demoVideoUrl });
  } else {
    await manageCreate(COLLECTIONS.PROJECT_VIDEOS, { projectId, demoVideoUrl });
  }
}

export async function deleteProjectVideo(projectId: string): Promise<void> {
  const existing = await getProjectVideo(projectId);
  if (existing) await manageDelete(COLLECTIONS.PROJECT_VIDEOS, existing.$id);
}
