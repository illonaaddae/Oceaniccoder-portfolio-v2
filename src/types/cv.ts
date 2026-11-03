// The CV store, as /api/cv returns it (api/shared/cv/model.js). Site items
// with no entry are on the CV by default; an entry holds what differs.

export type CvSection = "education" | "experience" | "projects" | "certifications";

/** The site collection each section links to. */
export type CvSourceCollection = "education" | "journey" | "projects" | "certifications";

interface Stamped {
  id: string;
  scope: "me";
  createdAt: string;
  updatedAt: string;
}

export interface CvLink {
  label: string;
  /** https: or mailto: only. */
  url: string;
}

export interface CvAward {
  id: string;
  title: string;
  issuer: string;
  year: string;
}

export interface CvActivity {
  id: string;
  org: string;
  location: string;
  title: string;
  period: string;
  bullets: string[];
}

export interface CvSkillLine {
  id: string;
  label: string;
  items: string;
}

export interface CvProfileInput {
  header: { name: string; title: string; lines: string[]; links: CvLink[] };
  awards: CvAward[];
  coCurricular: CvActivity[];
  skills: CvSkillLine[];
  /** Only "on-request": no referee details are stored. */
  references: { mode: "on-request"; text: string };
  footnotes: string[];
}

export interface CvProfile extends Stamped, CvProfileInput {
  kind: "profile";
}

/** Overrides of the linked site record, or a CV-only entry's own text. */
export interface CvEntryFields {
  title?: string;
  org?: string;
  location?: string;
  period?: string;
  subtitle?: string;
  issuer?: string;
  date?: string;
  label?: string;
  gpa?: string;
  gpaScale?: string;
  expectedGraduation?: string;
}

export interface CvApprovedText {
  roleLine: string;
  bullets: string[];
}

export interface CvEntry extends Stamped {
  kind: "entry";
  section: CvSection;
  /** Null for a CV-only entry. */
  source: { collection: CvSourceCollection; id: string } | null;
  show: boolean;
  /** Ascending within the section. */
  order: number;
  fields: CvEntryFields;
  /** The only text the CV uses. Projects stay off the CV until this is set. */
  approved: (CvApprovedText & { approvedAt: string }) | null;
  /** An AI draft waiting for approval; never on the CV. */
  draft: (CvApprovedText & { warnings: string[]; createdAt: string }) | null;
  sourceNotes: string;
}

export interface CvEntryInput {
  /** Set to edit a CV-only entry; a linked entry's id comes from its source. */
  id?: string;
  section?: CvSection;
  source?: { collection: CvSourceCollection; id: string } | null;
  show?: boolean;
  order?: number;
  fields?: CvEntryFields;
  approved?: CvApprovedText | null;
  sourceNotes?: string;
}

interface CvSourceRecord {
  $id: string;
  $createdAt?: string;
}

/** The site records entries link to, with only the fields the CV uses. */
export interface CvSources {
  education: (CvSourceRecord & {
    institution?: string;
    degree?: string;
    field?: string;
    period?: string;
    location?: string;
    gpa?: string;
    isVisible?: boolean;
    displayOrder?: number;
  })[];
  journey: (CvSourceRecord & {
    role?: string;
    company?: string;
    period?: string;
    location?: string;
    achievements?: string[];
    order?: number;
  })[];
  projects: (CvSourceRecord & { title?: string; year?: string; role?: string; status?: string })[];
  certifications: (CvSourceRecord & { title?: string; issuer?: string; date?: string })[];
}

export interface CvWarning {
  /** From the join (load and preview), or from the page layout (preview only). */
  code:
    | "no-profile"
    | "orphan"
    | "waiting-for-approval"
    | "header-overflow"
    | "link-scheme"
    | "overflow"
    | "pages";
  entryId: string | null;
  message: string;
}

export interface CvData {
  /** Null until the profile is first saved. */
  profile: CvProfile | null;
  entries: CvEntry[];
  sources: CvSources;
  warnings: CvWarning[];
  /**
   * The store version this data was read at, sent back with every write so a
   * write from a screen that is behind is refused. Null before the first write.
   */
  version: string | null;
}

/** A CV built as it would publish now, not stored anywhere. */
export interface CvPreview {
  pdfBase64: string;
  pages: number;
  warnings: CvWarning[];
}
