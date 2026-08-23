import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Project } from "../../types";
import { getProjectVideoMap, setProjectVideo, deleteProjectVideo } from "./projectVideos";
import {
  getProjectCaseStudyMap,
  setProjectCaseStudy,
  deleteProjectCaseStudy,
  pickCaseStudyFields,
} from "./projectCaseStudies";

// Strip fields the Appwrite "projects" collection doesn't have. The collection
// hit the per-row attribute-size cap, so demoVideoUrl is stored in a separate
// `project_videos` collection (see projectVideos.ts). We split writes — the
// demoVideoUrl field goes there, everything else goes to projects.
// Also drop Appwrite system fields ($id, $createdAt, etc.) which the SDK
// rejects on writes.
function stripUnknownAttrs(data: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set([
    "demoVideoUrl",
    "challenge",
    "solution",
    "results",
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

// Merge challenge, solution and results from project_case_studies.
async function joinCaseStudies(projects: Project[]): Promise<Project[]> {
  try {
    const map = await getProjectCaseStudyMap();
    return projects.map((p) => (map[p.$id] ? { ...p, ...map[p.$id] } : p));
  } catch {
    // A missing or unreachable collection must not take the projects page down.
    return projects;
  }
}

async function joinSideCollections(projects: Project[]): Promise<Project[]> {
  return joinCaseStudies(await joinVideos(projects));
}

export async function getProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS, [
    Query.orderDesc("$createdAt"),
  ]);
  const projects = response.documents as unknown as Project[];
  return joinSideCollections(projects);
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS, [
    Query.equal("featured", true),
  ]);
  const projects = response.documents as unknown as Project[];
  return joinSideCollections(projects);
}

export async function getProjectById(projectId: string): Promise<Project> {
  const doc = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId,
  )) as unknown as Project;
  const joined = await joinSideCollections([doc]);
  return joined[0];
}

/**
 * Appwrite rejects a whole document when it carries an attribute the collection
 * does not have, and the raw message says only which key was unknown. This
 * turns that into something actionable, because the fix is a migration script
 * rather than anything the person saving can do in the dashboard.
 */
function explainUnknownAttribute(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const match = /Unknown attribute: "?([\w]+)"?/i.exec(message);
  if (match) {
    throw new Error(
      `The projects collection has no "${match[1]}" attribute yet, so this project cannot be saved. ` +
        `Run: APPWRITE_API_KEY=... node scripts/add-case-study-attributes.mjs --apply`,
    );
  }
  throw error instanceof Error ? error : new Error(message);
}

export async function createProject(
  project: Omit<Project, "$id" | "$createdAt">,
): Promise<Project> {
  let result: Project;
  try {
    result = (await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      ID.unique(),
      stripUnknownAttrs(project as Record<string, unknown>),
    )) as unknown as Project;
  } catch (error) {
    explainUnknownAttribute(error);
  }

  // Write demoVideoUrl to side collection if provided.
  if (project.demoVideoUrl) {
    try {
      await setProjectVideo(result.$id, project.demoVideoUrl);
      result.demoVideoUrl = project.demoVideoUrl;
    } catch (err) {
      console.error("Failed to save project video:", err);
    }
  }

  // Same for the narrative fields, which live in project_case_studies because
  // the projects collection is at its row size cap.
  const caseStudy = pickCaseStudyFields(project as Record<string, unknown>);
  try {
    await setProjectCaseStudy(result.$id, caseStudy);
    Object.assign(result, caseStudy);
  } catch (err) {
    console.error("Failed to save project case study:", err);
  }

  return result;
}

export async function updateProject(
  projectId: string,
  project: Partial<Omit<Project, "$id" | "$createdAt">>,
): Promise<Project> {
  let result: Project;
  try {
    result = (await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId,
      stripUnknownAttrs(project as Record<string, unknown>),
    )) as unknown as Project;
  } catch (error) {
    explainUnknownAttribute(error);
  }

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

  // Only touch the case study row when the caller actually sent one of the
  // fields, so a partial update cannot wipe writing it never saw.
  const sentCaseStudyField = ["challenge", "solution", "results"].some(
    (field) => (project as Record<string, unknown>)[field] !== undefined,
  );
  if (sentCaseStudyField) {
    const caseStudy = pickCaseStudyFields(project as Record<string, unknown>);
    try {
      await setProjectCaseStudy(projectId, caseStudy);
      Object.assign(result, caseStudy);
    } catch (err) {
      console.error("Failed to update project case study:", err);
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
  try {
    await deleteProjectCaseStudy(projectId);
  } catch (err) {
    console.error("Failed to cascade delete project case study:", err);
  }
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);
}
