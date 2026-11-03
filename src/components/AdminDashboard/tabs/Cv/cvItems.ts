// What the CV tab shows for each item: the server's section lists (CV order)
// joined with the entries and site records, and the fields each section can
// override. The field lists mirror SECTION_FIELDS and the site mapping
// mirrors fromRecord in api/shared/cv/resolve.js; the server checks both.
import type { CvData, CvEntry, CvEntryFields, CvSection, CvSourceCollection } from "@/types/cv";

export const SECTION_LABEL: Record<CvSection, string> = {
  education: "Education",
  experience: "Work experience",
  projects: "Projects and research",
  certifications: "Certifications",
};

export const SECTION_COLLECTION: Record<CvSection, CvSourceCollection> = {
  education: "education",
  experience: "journey",
  projects: "projects",
  certifications: "certifications",
};

/** Sections whose entries carry a role line and bullets. */
export const TEXT_SECTIONS: ReadonlySet<CvSection> = new Set(["experience", "projects"]);

export interface FieldDef {
  key: keyof CvEntryFields;
  label: string;
  hint?: string;
}

/** The fields an entry may set, per section, in form order. */
export const SECTION_FIELDS: Record<CvSection, FieldDef[]> = {
  education: [
    { key: "org", label: "Institution" },
    { key: "location", label: "Location" },
    { key: "subtitle", label: "Degree" },
    { key: "period", label: "Period" },
    { key: "expectedGraduation", label: "Expected graduation", hint: "Such as September 2027." },
    { key: "gpa", label: "GPA" },
    { key: "gpaScale", label: "GPA out of", hint: "Such as 5.00." },
  ],
  experience: [
    { key: "org", label: "Organisation" },
    { key: "location", label: "Location" },
    { key: "title", label: "Role" },
    { key: "period", label: "Period" },
  ],
  projects: [
    { key: "title", label: "Title" },
    { key: "period", label: "Period" },
    {
      key: "subtitle",
      label: "Subtitle",
      hint: "Shown under the title when there is no role line.",
    },
  ],
  certifications: [
    { key: "title", label: "Title" },
    { key: "issuer", label: "Issuer" },
    { key: "label", label: "Label", hint: "Such as (In progress)." },
    { key: "date", label: "Date" },
  ],
};

/** The field a CV-only entry can't do without, per section. */
export const REQUIRED_FIELD: Record<CvSection, keyof CvEntryFields> = {
  education: "org",
  experience: "org",
  projects: "title",
  certifications: "title",
};

type SiteRecord = CvData["sources"][CvSourceCollection][number];

/** The CV fields a site record gives before any override. */
export function siteValues(section: CvSection, record: SiteRecord | null): CvEntryFields {
  if (!record) return {};
  // One record type per collection; read them alike and keep only strings.
  const r = record as unknown as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v : undefined);
  switch (section) {
    case "education":
      return {
        org: text(r.institution),
        location: text(r.location),
        subtitle: [text(r.degree), text(r.field)].filter(Boolean).join(" in ") || undefined,
        period: text(r.period),
        gpa: text(r.gpa),
      };
    case "experience":
      return {
        org: text(r.company),
        location: text(r.location),
        title: text(r.role),
        period: text(r.period),
      };
    case "projects":
      return { title: text(r.title), period: text(r.year) };
    case "certifications":
      return { title: text(r.title), issuer: text(r.issuer), date: text(r.date) };
  }
}

/** What the CV prints first: the organisation for education and jobs, else the title. */
function nameOf(section: CvSection, v: CvEntryFields): string {
  const first = section === "education" || section === "experience" ? v.org || v.title : v.title;
  return first || v.org || "Untitled item";
}

export interface SectionRow {
  id: string;
  section: CvSection;
  show: boolean;
  /** The entry's site item is gone. */
  orphan: boolean;
  entry: CvEntry | null;
  record: SiteRecord | null;
  /** The site's values with the entry's overrides on top. */
  values: CvEntryFields;
  name: string;
  /** A shown project with no approved text, so it is left off the CV. */
  waiting: boolean;
}

/** The rows of one section, in CV order, orphans last. */
export function sectionRows(data: CvData, section: CvSection): SectionRow[] {
  const records = data.sources[SECTION_COLLECTION[section]] ?? [];
  return (data.sections[section] ?? []).map(({ id, show, orphan }) => {
    const entry = data.entries.find((e) => e.id === id) ?? null;
    const sourceId = entry ? entry.source?.id : id.slice(`entry.${section}.`.length);
    const record = sourceId ? (records.find((r) => r.$id === sourceId) ?? null) : null;
    const values = { ...siteValues(section, record), ...(entry?.fields ?? {}) };
    return {
      id,
      section,
      show,
      orphan,
      entry,
      record,
      values,
      name: nameOf(section, values),
      waiting: section === "projects" && show && !orphan && !entry?.approved,
    };
  });
}

/** The ids with the one at `index` moved by `by` places. */
export function moveId(ids: string[], index: number, by: -1 | 1): string[] {
  const next = [...ids];
  const [id] = next.splice(index, 1);
  next.splice(index + by, 0, id);
  return next;
}

/** One bullet per line, blank lines dropped. */
export const linesOf = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
