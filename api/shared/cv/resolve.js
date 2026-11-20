/* global module, require */
// Joins the CV store (profile and entries) with the site's records into the
// CvDocument that layout.js draws. Pure: the caller reads both stores.
//
// Rules (owner decisions of 2026-11-02 where they differ from the design):
// - A site item with no entry is on the CV: new items go on by default. The
//   one exception is an education row hidden on the site (isVisible false),
//   which stays off until its entry says show.
// - Items with no entry come first in their section, in the site's own order
//   (they are the newest additions), then entries by `order`.
// - Text resolves as approved, then the entry's field overrides, then the
//   site record. Experience bullets fall back to the job's achievements.
// - Only approved text is used, never a draft. A project with no approved
//   text is left out and reported as waiting for approval.
// - An entry whose site record is gone (an orphan) is left out and reported.

const {
  SECTIONS,
  SECTION_COLLECTION,
  SECTION_FIELDS,
  DEFAULT_REFERENCES,
  entryIdFor,
} = require("./model");

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "March 2026" as 202603, the sort the site's certification list uses; 0 if unparseable. */
function monthRank(date) {
  if (typeof date !== "string" || !date.trim()) return 0;
  const parts = date.trim().split(/\s+/);
  const year = Number(parts[parts.length - 1]);
  if (!Number.isFinite(year)) return 0;
  return year * 100 + (MONTHS.indexOf(parts[0].toLowerCase()) + 1);
}

const newestFirst = (a, b) => String(b.$createdAt ?? "").localeCompare(String(a.$createdAt ?? ""));
// Records without the number sort after those with one, as Cosmos ORDER BY does.
const byNumber = (field, dir) => (a, b) => {
  const x = typeof a[field] === "number" ? a[field] : null;
  const y = typeof b[field] === "number" ? b[field] : null;
  if (x === y) return newestFirst(a, b);
  if (x === null) return 1;
  if (y === null) return -1;
  return dir === "asc" ? x - y : y - x;
};

// The order each list shows in on the site (src/services/api/*.ts).
const SITE_ORDER = {
  education: byNumber("displayOrder", "desc"),
  experience: byNumber("order", "asc"),
  projects: newestFirst,
  certifications: (a, b) => monthRank(b.date) - monthRank(a.date) || newestFirst(a, b),
};

/** Whether a site item with no entry is on the CV. */
function shownByDefault(section, record) {
  return !(section === "education" && record.isVisible === false);
}

function byEntryOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id));
}

/**
 * Every CV item of one section in CV order, shown or not:
 * `{ id, entry, record, show }`, where `entry` is null for a site item that
 * has no entry yet and `record` is null for a CV-only entry. Entries whose
 * site record is gone come back separately as `orphans`.
 */
function sectionItems(section, entries, siteRecords) {
  const collection = SECTION_COLLECTION[section];
  const records = Array.isArray(siteRecords?.[collection]) ? siteRecords[collection] : [];
  const recordById = new Map(records.map((r) => [r.$id, r]));
  const own = (Array.isArray(entries) ? entries : []).filter((e) => e.section === section);
  const linked = new Set(own.filter((e) => e.source).map((e) => e.source.id));

  const fresh = records
    .filter((r) => !linked.has(r.$id))
    .sort(SITE_ORDER[section])
    .map((record) => ({
      id: entryIdFor(section, record.$id),
      entry: null,
      record,
      show: shownByDefault(section, record),
    }));
  const orphans = [];
  const arranged = [];
  for (const entry of [...own].sort(byEntryOrder)) {
    const record = entry.source ? recordById.get(entry.source.id) : null;
    if (entry.source && !record) orphans.push(entry);
    else arranged.push({ id: entry.id, entry, record, show: entry.show !== false });
  }
  return { items: [...fresh, ...arranged], orphans };
}

/** The layout fields a site record gives, before overrides. */
function fromRecord(section, record) {
  if (!record) return {};
  switch (section) {
    case "education":
      return {
        org: record.institution,
        location: record.location,
        subtitle: [record.degree, record.field].filter(Boolean).join(" in "),
        period: record.period,
        gpa: record.gpa,
      };
    case "experience":
      return {
        org: record.company,
        location: record.location,
        title: record.role,
        period: record.period,
        bullets: record.achievements,
      };
    case "projects":
      return { title: record.title, period: record.year };
    case "certifications":
      return { title: record.title, issuer: record.issuer, date: record.date };
    default:
      return {};
  }
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function textList(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()) : [];
}

/** One layout item, or null when it can't go on the CV yet. */
function toLayoutItem(section, { entry, record }) {
  const base = fromRecord(section, record);
  const merged = { ...base, ...(entry?.fields ?? {}) };
  const item = {};
  for (const field of SECTION_FIELDS[section]) {
    const value = text(merged[field]).trim();
    if (value) item[field] = value;
  }
  const approved = entry?.approved;
  if (section === "projects") {
    if (!approved) return null;
    if (text(approved.roleLine).trim()) item.subtitle = approved.roleLine.trim();
    item.bullets = textList(approved.bullets);
  }
  if (section === "experience") {
    if (approved && text(approved.roleLine).trim()) item.title = approved.roleLine.trim();
    item.bullets = approved ? textList(approved.bullets) : textList(base.bullets);
  }
  return item;
}

function entryLabel(section, { entry, record }) {
  const fields = { ...fromRecord(section, record), ...(entry?.fields ?? {}) };
  return text(fields.title).trim() || text(fields.org).trim() || "An entry";
}

function resolveProfile(profile) {
  const header = profile?.header ?? {};
  return {
    header: {
      name: text(header.name),
      title: text(header.title),
      lines: textList(header.lines),
      links: (Array.isArray(header.links) ? header.links : []).map((l) => ({
        label: text(l?.label),
        url: text(l?.url),
      })),
    },
    awards: (profile?.awards ?? []).map(({ title, issuer, year }) => ({ title, issuer, year })),
    coCurricular: (profile?.coCurricular ?? []).map(
      ({ org, location, title, period, bullets }) => ({
        org,
        location,
        title,
        period,
        bullets: textList(bullets),
      }),
    ),
    skills: (profile?.skills ?? []).map(({ label, items }) => ({ label, items })),
    references: { text: text(profile?.references?.text).trim() || DEFAULT_REFERENCES },
    footnotes: textList(profile?.footnotes),
  };
}

/**
 * `store`: { profile, entries } from the CV store (profile may be null).
 * `siteRecords`: { education, journey, projects, certifications }, rows in the
 * site's shape ($id). Returns { cv, warnings }, warnings as
 * [{ code, entryId, message }] for the admin.
 */
function resolveCv(store, siteRecords) {
  const warnings = [];
  const { header, ...profileSections } = resolveProfile(store?.profile);
  if (!store?.profile)
    warnings.push({
      code: "no-profile",
      entryId: null,
      message: "The CV has no profile yet, so the header is empty.",
    });

  const sections = {};
  for (const section of SECTIONS) {
    const { items, orphans } = sectionItems(section, store?.entries, siteRecords);
    for (const orphan of orphans)
      warnings.push({
        code: "orphan",
        entryId: orphan.id,
        message: `A ${section} entry links to a site item that no longer exists, so it is left out.`,
      });
    sections[section] = [];
    for (const item of items) {
      if (!item.show) continue;
      const resolved = toLayoutItem(section, item);
      if (resolved) sections[section].push(resolved);
      else
        warnings.push({
          code: "waiting-for-approval",
          entryId: item.id,
          message: `"${entryLabel(section, item)}" is waiting for approval, so it is left off the CV.`,
        });
    }
  }

  return {
    cv: {
      header,
      education: sections.education,
      awards: profileSections.awards,
      experience: sections.experience,
      projects: sections.projects,
      certifications: sections.certifications,
      coCurricular: profileSections.coCurricular,
      skills: profileSections.skills,
      references: profileSections.references,
      footnotes: profileSections.footnotes,
    },
    warnings,
  };
}

module.exports = { resolveCv, sectionItems, shownByDefault };
