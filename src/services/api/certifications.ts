import { COLLECTIONS } from "./collections";
import type { Certification } from "../../types";
import { listRows, manageCreate, manageDelete, manageUpdate } from "./dataApi";

const MONTH_INDEX: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/** Turn a "Month YYYY" string into a sortable number (YYYYMM); 0 if unparseable. */
function certDateRank(date?: string): number {
  if (!date) return 0;
  const parts = date.trim().split(/\s+/);
  const year = Number(parts[parts.length - 1]);
  if (!Number.isFinite(year)) return 0;
  const month = MONTH_INDEX[parts[0]?.toLowerCase()] ?? 0;
  return year * 100 + month;
}

export async function getCertifications(): Promise<Certification[]> {
  const response = await listRows(COLLECTIONS.CERTIFICATIONS);
  const certs = response.documents as unknown as Certification[];
  // Newest first: by date obtained, falling back to creation time for ties.
  return certs.sort((a, b) => {
    const byDate = certDateRank(b.date) - certDateRank(a.date);
    if (byDate !== 0) return byDate;
    return (b.$createdAt ?? "").localeCompare(a.$createdAt ?? "");
  });
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
  if (cert.certificationType) cleanedData.certificationType = cert.certificationType;
  if (cert.credential) cleanedData.credential = cert.credential;
  if (cert.skills && cert.skills.length > 0) cleanedData.skills = cert.skills;
  if (cert.downloadLink) cleanedData.downloadLink = cert.downloadLink;
  if (cert.verifyLink) cleanedData.verifyLink = cert.verifyLink;
  if (cert.platformColor) cleanedData.platformColor = cert.platformColor;
  if (cert.platformIconUrl) cleanedData.platformIconUrl = cert.platformIconUrl;
  if (cert.image) cleanedData.image = cert.image;

  return manageCreate<Certification>(COLLECTIONS.CERTIFICATIONS, cleanedData);
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
  if (cert.certificationType !== undefined)
    cleanedData.certificationType = cert.certificationType || null;
  if (cert.credential !== undefined) cleanedData.credential = cert.credential || null;
  if (cert.skills !== undefined) cleanedData.skills = cert.skills;
  if (cert.platformColor !== undefined) cleanedData.platformColor = cert.platformColor || null;
  if (cert.platformIconUrl !== undefined)
    cleanedData.platformIconUrl = cert.platformIconUrl || null;
  if (cert.downloadLink !== undefined) cleanedData.downloadLink = cert.downloadLink || null;
  if (cert.verifyLink !== undefined) cleanedData.verifyLink = cert.verifyLink || null;
  if (cert.image !== undefined) cleanedData.image = cert.image || null;

  return manageUpdate<Certification>(COLLECTIONS.CERTIFICATIONS, certId, cleanedData);
}

export async function deleteCertification(certId: string): Promise<void> {
  await manageDelete(COLLECTIONS.CERTIFICATIONS, certId);
}
