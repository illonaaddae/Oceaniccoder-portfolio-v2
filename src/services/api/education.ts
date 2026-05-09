import { databases, DATABASE_ID, COLLECTIONS, ID } from "./client";
import type { Education } from "../../types";

export async function getEducation(): Promise<Education[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EDUCATION,
  );
  return response.documents as unknown as Education[];
}

export async function createEducation(
  edu: Omit<Education, "$id">,
): Promise<Education> {
  const cleanedData: Record<string, unknown> = {
    institution: edu.institution,
    degree: edu.degree,
    period: edu.period,
  };
  if (edu.field) cleanedData.field = edu.field;
  if (edu.achievement) cleanedData.achievement = edu.achievement;
  if (edu.description) cleanedData.description = edu.description;
  const logoUrl = edu.universityLogo || edu.logo;
  if (logoUrl) cleanedData.universityLogo = logoUrl;
  if (edu.gpa) cleanedData.gpa = edu.gpa;
  if (edu.classHonours) cleanedData.classHonours = edu.classHonours;
  if (edu.startDate) cleanedData.startDate = edu.startDate;
  if (edu.endDate) cleanedData.endDate = edu.endDate;
  if (edu.isOngoing !== undefined) cleanedData.isOngoing = edu.isOngoing;
  if (edu.initials) cleanedData.initials = edu.initials;
  if (edu.location) cleanedData.location = edu.location;
  if (edu.isVisible !== undefined) cleanedData.isVisible = edu.isVisible;

  const result = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.EDUCATION,
    ID.unique(),
    cleanedData,
  );
  return result as unknown as Education;
}

export async function updateEducation(
  eduId: string,
  edu: Partial<Omit<Education, "$id">>,
): Promise<Education> {
  const cleanedData: Record<string, unknown> = {};
  if (edu.institution !== undefined) cleanedData.institution = edu.institution;
  if (edu.degree !== undefined) cleanedData.degree = edu.degree;
  if (edu.period !== undefined) cleanedData.period = edu.period;
  if (edu.field !== undefined) cleanedData.field = edu.field || null;
  if (edu.achievement !== undefined)
    cleanedData.achievement = edu.achievement || null;
  if (edu.description !== undefined)
    cleanedData.description = edu.description || null;
  if (edu.universityLogo !== undefined || edu.logo !== undefined) {
    cleanedData.universityLogo = edu.universityLogo || edu.logo || null;
  }
  if (edu.gpa !== undefined) cleanedData.gpa = edu.gpa || null;
  if (edu.classHonours !== undefined)
    cleanedData.classHonours = edu.classHonours || null;
  if (edu.startDate !== undefined)
    cleanedData.startDate = edu.startDate || null;
  if (edu.endDate !== undefined) cleanedData.endDate = edu.endDate || null;
  if (edu.isOngoing !== undefined) cleanedData.isOngoing = edu.isOngoing;
  if (edu.initials !== undefined) cleanedData.initials = edu.initials || null;
  if (edu.location !== undefined) cleanedData.location = edu.location || null;
  if (edu.isVisible !== undefined) cleanedData.isVisible = edu.isVisible;

  const result = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.EDUCATION,
    eduId,
    cleanedData,
  );
  return result as unknown as Education;
}

export async function deleteEducation(eduId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.EDUCATION, eduId);
}
