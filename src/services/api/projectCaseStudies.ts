// Project Case Studies API — separate collection for the narrative fields.
//
// Why a separate collection: the `projects` collection is at its row size cap.
// challenge, solution and results could not be added there at 4000, 2000 or
// even 1000 characters, the same wall demoVideoUrl hit. This collection holds
// { projectId, challenge, solution, results } and is joined into Project
// objects on read by getProjects() in projects.ts.
//
// Constraints:
// - projectId is required (FK to projects.$id) — one case study per project
// - the three narrative fields are optional, since most projects have none
import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";

export interface ProjectCaseStudy {
  $id: string;
  projectId: string;
  challenge?: string;
  solution?: string;
  results?: string;
}

export type CaseStudyFields = Pick<ProjectCaseStudy, "challenge" | "solution" | "results">;

const FIELDS: (keyof CaseStudyFields)[] = ["challenge", "solution", "results"];

export function pickCaseStudyFields(source: Record<string, unknown>): CaseStudyFields {
  const out: CaseStudyFields = {};
  for (const field of FIELDS) {
    const value = source[field];
    if (typeof value === "string") out[field] = value;
  }
  return out;
}

export function hasAnyCaseStudyContent(fields: CaseStudyFields): boolean {
  return FIELDS.some((field) => (fields[field] ?? "").trim().length > 0);
}

export async function getProjectCaseStudies(): Promise<ProjectCaseStudy[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_CASE_STUDIES, [
    Query.limit(100),
  ]);
  return response.documents as unknown as ProjectCaseStudy[];
}

// Build a {projectId -> fields} map for joining into a Project list.
export async function getProjectCaseStudyMap(): Promise<Record<string, CaseStudyFields>> {
  const studies = await getProjectCaseStudies();
  const map: Record<string, CaseStudyFields> = {};
  for (const study of studies) {
    map[study.projectId] = {
      challenge: study.challenge,
      solution: study.solution,
      results: study.results,
    };
  }
  return map;
}

export async function getProjectCaseStudy(projectId: string): Promise<ProjectCaseStudy | null> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_CASE_STUDIES, [
    Query.equal("projectId", projectId),
    Query.limit(1),
  ]);
  return (response.documents[0] as unknown as ProjectCaseStudy) ?? null;
}

// Upsert pattern, matching setProjectVideo: all three fields empty deletes the
// row, anything present creates or updates it.
export async function setProjectCaseStudy(
  projectId: string,
  fields: CaseStudyFields,
): Promise<void> {
  const existing = await getProjectCaseStudy(projectId);

  if (!hasAnyCaseStudyContent(fields)) {
    if (existing) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_CASE_STUDIES, existing.$id);
    }
    return;
  }

  const payload = {
    challenge: fields.challenge ?? "",
    solution: fields.solution ?? "",
    results: fields.results ?? "",
  };

  if (existing) {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_CASE_STUDIES,
      existing.$id,
      payload,
    );
  } else {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.PROJECT_CASE_STUDIES, ID.unique(), {
      projectId,
      ...payload,
    });
  }
}

export async function deleteProjectCaseStudy(projectId: string): Promise<void> {
  const existing = await getProjectCaseStudy(projectId);
  if (existing) {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_CASE_STUDIES, existing.$id);
  }
}
