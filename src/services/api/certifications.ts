import { databases, DATABASE_ID, COLLECTIONS, ID } from "./client";
import type { Certification } from "../../types";

export async function getCertifications(): Promise<Certification[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS,
  );
  return response.documents as unknown as Certification[];
}

export async function createCertification(
  cert: Omit<Certification, "$id" | "$createdAt">,
): Promise<Certification> {
  const cleanedData: Record<string, unknown> = {
    title: cert.title,
    issuer: cert.issuer,
    date: cert.date,
    platform: cert.platform,
  };
  if (cert.credential) cleanedData.credential = cert.credential;
  if (cert.skills && cert.skills.length > 0) cleanedData.skills = cert.skills;
  if (cert.downloadLink) cleanedData.downloadLink = cert.downloadLink;
  if (cert.verifyLink) cleanedData.verifyLink = cert.verifyLink;
  if (cert.platformColor) cleanedData.platformColor = cert.platformColor;
  if (cert.image) cleanedData.image = cert.image;

  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS,
    ID.unique(),
    cleanedData,
  ) as unknown as Certification;
}

export async function updateCertification(
  certId: string,
  cert: Partial<Omit<Certification, "$id" | "$createdAt">>,
): Promise<Certification> {
  const cleanedData: Record<string, unknown> = {};
  if (cert.title !== undefined) cleanedData.title = cert.title;
  if (cert.issuer !== undefined) cleanedData.issuer = cert.issuer;
  if (cert.date !== undefined) cleanedData.date = cert.date;
  if (cert.platform !== undefined) cleanedData.platform = cert.platform;
  if (cert.credential !== undefined)
    cleanedData.credential = cert.credential || null;
  if (cert.skills !== undefined) cleanedData.skills = cert.skills;
  if (cert.platformColor !== undefined)
    cleanedData.platformColor = cert.platformColor || null;
  if (cert.downloadLink !== undefined)
    cleanedData.downloadLink = cert.downloadLink || null;
  if (cert.verifyLink !== undefined)
    cleanedData.verifyLink = cert.verifyLink || null;
  if (cert.image !== undefined) cleanedData.image = cert.image || null;

  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS,
    certId,
    cleanedData,
  ) as unknown as Certification;
}

export async function deleteCertification(certId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS,
    certId,
  );
}
