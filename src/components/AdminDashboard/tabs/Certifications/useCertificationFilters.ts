import { useMemo, useState } from "react";
import type { Certification } from "@/types";

export interface CertificationFilters {
  search: string;
  platform: string;
  type: string;
  year: string;
}

const EMPTY: CertificationFilters = { search: "", platform: "", type: "", year: "" };

/** The year sits at the end of a "Month YYYY" or bare "YYYY" date string. */
export function certYear(date?: string): string {
  const match = date?.trim().match(/(\d{4})$/);
  return match ? match[1] : "";
}

function matches(cert: Certification, filters: CertificationFilters): boolean {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      cert.title,
      cert.issuer,
      cert.platform,
      cert.certificationType,
      cert.credential,
    ]
      .concat(cert.skills ?? [])
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.platform && cert.platform !== filters.platform) return false;
  if (filters.type && (cert.certificationType ?? "") !== filters.type) return false;
  if (filters.year && certYear(cert.date) !== filters.year) return false;
  return true;
}

/**
 * Tab-level filtering for the certifications table. The dashboard's global
 * search only looks at title and issuer, which is not enough once the list
 * runs past a page: platform, type and year are how you actually navigate it.
 */
export function useCertificationFilters(certifications: Certification[]) {
  const [filters, setFilters] = useState<CertificationFilters>(EMPTY);

  const platforms = useMemo(
    () => [...new Set(certifications.map((c) => c.platform).filter(Boolean))].sort(),
    [certifications],
  );

  const types = useMemo(
    () => [...new Set(certifications.map((c) => c.certificationType).filter(Boolean))].sort(),
    [certifications],
  );

  const years = useMemo(
    () =>
      [...new Set(certifications.map((c) => certYear(c.date)).filter(Boolean))].sort(
        (a, b) => Number(b) - Number(a),
      ),
    [certifications],
  );

  const filtered = useMemo(
    () => certifications.filter((cert) => matches(cert, filters)),
    [certifications, filters],
  );

  const isFiltered =
    filters.search !== "" || !!filters.platform || !!filters.type || !!filters.year;

  return {
    filters,
    setFilter: (patch: Partial<CertificationFilters>) =>
      setFilters((prev) => ({ ...prev, ...patch })),
    clearFilters: () => setFilters(EMPTY),
    isFiltered,
    filtered,
    platforms: platforms as string[],
    types: types as string[],
    years,
  };
}
