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
import { COLLECTIONS } from "./collections";
import { listRows, manageCreate, manageDelete, manageUpdate } from "./dataApi";

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
  const response = await listRows(COLLECTIONS.PROJECT_CASE_STUDIES, { limit: 100 });
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
  const response = await listRows(COLLECTIONS.PROJECT_CASE_STUDIES, {
    where: { projectId },
    limit: 1,
  });
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
    if (existing) await manageDelete(COLLECTIONS.PROJECT_CASE_STUDIES, existing.$id);
    return;
  }

  const payload = {
    challenge: fields.challenge ?? "",
    solution: fields.solution ?? "",
    results: fields.results ?? "",
  };

  if (existing) {
    await manageUpdate(COLLECTIONS.PROJECT_CASE_STUDIES, existing.$id, payload);
  } else {
    await manageCreate(COLLECTIONS.PROJECT_CASE_STUDIES, { projectId, ...payload });
  }
}

export async function deleteProjectCaseStudy(projectId: string): Promise<void> {
  const existing = await getProjectCaseStudy(projectId);
  if (existing) await manageDelete(COLLECTIONS.PROJECT_CASE_STUDIES, existing.$id);
}
