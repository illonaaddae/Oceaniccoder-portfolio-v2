/* global module, require */
// The CV store's records and the checks every write goes through. Pure: no
// Cosmos and no clock, so it is tested on its own.
//
// Records, all in the `cv` container of the `personal` database, partition
// `/scope` = "me" (see ../personal.js):
//   profile   id "profile": header, awards, co-curricular, skills, references
//             and footnotes, saved whole. List order is CV order.
//   entry     one per CV item in education, experience, projects or
//             certifications. Linked to a site record ({ collection, id }) or
//             CV-only (source null). Holds show, order, field overrides, the
//             text the owner approved and (from the AI step) a draft.
//
// A linked entry's id is derived from its site record, so a record has at
// most one entry; a CV-only entry's id starts with "cv-".

const { HttpError } = require("../http");

const PROFILE_ID = "profile";
const VERSION_ID = "cv-version";

const SECTIONS = ["education", "experience", "projects", "certifications"];
/** The site collection each section links to. */
const SECTION_COLLECTION = {
  education: "education",
  experience: "journey",
  projects: "projects",
  certifications: "certifications",
};
const COLLECTION_SECTION = Object.fromEntries(
  Object.entries(SECTION_COLLECTION).map(([section, collection]) => [collection, section]),
);

/** The layout fields (layout.js) an entry may set, per section. */
const SECTION_FIELDS = {
  education: ["org", "location", "subtitle", "period", "expectedGraduation", "gpa", "gpaScale"],
  experience: ["org", "location", "title", "period"],
  projects: ["title", "period", "subtitle"],
  certifications: ["title", "issuer", "label", "date"],
};
/** The field a CV-only entry can't do without, per section, and its name in errors. */
const REQUIRED_FIELD = {
  education: ["org", "an institution"],
  experience: ["org", "an organisation"],
  projects: ["title", "a title"],
  certifications: ["title", "a title"],
};
/** Sections whose entries carry approved text: a role line and bullets. */
const TEXT_SECTIONS = new Set(["experience", "projects"]);

// A transactional batch holds at most 100 operations, and a reorder writes a
// whole section plus the version document in one.
const MAX_SECTION_ENTRIES = 90;
const MAX_BULLETS = 6;
const BULLET_MAX = 300;
const ROLE_LINE_MAX = 160;
const FIELD_MAX = 160;
const SOURCE_NOTES_MAX = 8000;
const ORDER_LIMIT = 1_000_000;

const DEFAULT_REFERENCES = "Available upon request";

const ITEM_ID = /^[A-Za-z0-9_-]{1,64}$/;
const ENTRY_ID = new RegExp(`^entry\\.(${SECTIONS.join("|")})\\.[A-Za-z0-9_-]{1,67}$`);
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;
// eslint-disable-next-line no-control-regex
const CONTROL_EXCEPT_LINES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function invalid(message) {
  return new HttpError(400, message);
}

/** One line of text, trimmed. Control characters (line breaks included) are refused. */
function line(value, label, max, { required = false } = {}) {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") throw invalid(`${label} must be text.`);
  const trimmed = value.trim();
  if (CONTROL.test(trimmed)) throw invalid(`${label} must be a single line of plain text.`);
  if (required && !trimmed) throw invalid(`${label} is required.`);
  if (trimmed.length > max) throw invalid(`${label} must be ${max} characters or fewer.`);
  return trimmed;
}

/** Free text that may run over several lines. */
function paragraph(value, label, max) {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") throw invalid(`${label} must be text.`);
  const trimmed = value.trim();
  if (CONTROL_EXCEPT_LINES.test(trimmed)) throw invalid(`${label} must be plain text.`);
  if (trimmed.length > max) throw invalid(`${label} must be ${max} characters or fewer.`);
  return trimmed;
}

function list(value, label, max) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid(`${label} must be a list.`);
  if (value.length > max) throw invalid(`${label} can have at most ${max} entries.`);
  return value;
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid(`${label} is not valid.`);
  return value;
}

function itemId(value, label) {
  if (typeof value !== "string" || !ITEM_ID.test(value))
    throw invalid(`${label} is not a valid id.`);
  return value;
}

function entryId(value) {
  if (typeof value !== "string" || !ENTRY_ID.test(value))
    throw invalid("That CV entry id is not valid.");
  return value;
}

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw invalid(`${label} must be one of: ${allowed.join(", ")}.`);
  return value;
}

function section(value) {
  return oneOf(value, SECTIONS, "Section");
}

/** Only https: and mailto: links, so a pasted javascript: link never reaches a PDF. */
function link(value, label) {
  const url = line(value, label, 300, { required: true });
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw invalid(`${label} must be a full link, like https://example.com.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "mailto:")
    throw invalid(`${label} must start with https: or mailto:.`);
  return url;
}

function bullets(value, label, { min = 0 } = {}) {
  const out = list(value, label, MAX_BULLETS)
    .map((b, i) => line(b, `${label} ${i + 1}`, BULLET_MAX))
    .filter(Boolean);
  if (out.length < min) throw invalid(`${label} needs at least ${min}.`);
  return out;
}

/** Items of a profile list, each with an id the editor keeps; ids must be unique. */
function items(value, label, max, parse) {
  const parsed = list(value, label, max).map((raw, i) => {
    const name = `${label} ${i + 1}`;
    object(raw, name);
    return { id: itemId(raw.id, `${name} id`), ...parse(raw, name) };
  });
  if (new Set(parsed.map((p) => p.id)).size !== parsed.length)
    throw invalid(`${label} has two items with the same id.`);
  return parsed;
}

/** The editable fields of the profile. Unknown fields are dropped. */
function parseProfile(input) {
  object(input, "The profile");
  const header = object(input.header ?? {}, "The header");
  const references = object(input.references ?? {}, "References");
  return {
    header: {
      name: line(header.name, "Name", 80, { required: true }),
      title: line(header.title, "Title", 120),
      lines: list(header.lines, "Contact lines", 6)
        .map((l, i) => line(l, `Contact line ${i + 1}`, FIELD_MAX))
        .filter(Boolean),
      links: list(header.links, "Links", 6).map((raw, i) => {
        object(raw, `Link ${i + 1}`);
        return {
          label: line(raw.label, `Link ${i + 1} label`, 60, { required: true }),
          url: link(raw.url, `Link ${i + 1}`),
        };
      }),
    },
    awards: items(input.awards, "Award", 30, (raw, name) => ({
      title: line(raw.title, `${name} title`, FIELD_MAX, { required: true }),
      issuer: line(raw.issuer, `${name} issuer`, FIELD_MAX),
      year: line(raw.year, `${name} year`, 40),
    })),
    coCurricular: items(input.coCurricular, "Co-curricular activity", 20, (raw, name) => ({
      org: line(raw.org, `${name} organisation`, FIELD_MAX, { required: true }),
      location: line(raw.location, `${name} location`, FIELD_MAX),
      title: line(raw.title, `${name} role`, FIELD_MAX),
      period: line(raw.period, `${name} period`, 80),
      bullets: bullets(raw.bullets, `${name} bullet`),
    })),
    skills: items(input.skills, "Skills line", 20, (raw, name) => ({
      label: line(raw.label, `${name} label`, 60, { required: true }),
      items: line(raw.items, `${name} items`, 600, { required: true }),
    })),
    // Owner decision D1: references read "Available upon request" and no
    // referee details are stored, so there is one mode and no referee list.
    references: {
      mode: oneOf(references.mode ?? "on-request", ["on-request"], "References mode"),
      text: line(references.text, "References text", FIELD_MAX) || DEFAULT_REFERENCES,
    },
    footnotes: list(input.footnotes, "Footnotes", 6)
      .map((f, i) => line(f, `Footnote ${i + 1}`, 300))
      .filter(Boolean),
  };
}

function parseSource(raw) {
  if (raw === undefined || raw === null) return null;
  object(raw, "The linked site item");
  const collection = oneOf(raw.collection, Object.keys(COLLECTION_SECTION), "Linked collection");
  return { collection, id: itemId(raw.id, "The linked site item") };
}

function parseFields(raw, sec) {
  if (raw === undefined || raw === null) return {};
  object(raw, "Fields");
  const allowed = SECTION_FIELDS[sec];
  const fields = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.includes(key)) throw invalid(`${key} can't be set on a ${sec} entry.`);
    const text = line(value, key, FIELD_MAX);
    // An empty override falls back to the site record, so it isn't stored.
    if (text) fields[key] = text;
  }
  return fields;
}

function parseApproved(raw, sec) {
  if (raw === undefined || raw === null) return null;
  if (!TEXT_SECTIONS.has(sec)) throw invalid(`A ${sec} entry has no role line or bullets.`);
  object(raw, "The approved text");
  return {
    roleLine: line(raw.roleLine, "Role line", ROLE_LINE_MAX),
    bullets: bullets(raw.bullets, "Bullet", { min: 1 }),
  };
}

function parseOrder(value) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || Math.abs(value) > ORDER_LIMIT)
    throw invalid(`Order must be a whole number from -${ORDER_LIMIT} to ${ORDER_LIMIT}.`);
  return value;
}

/**
 * The editable fields of a CV entry. `approved` is the text the owner wrote
 * or approved; the AI draft is never set here. `order` is null when the
 * caller left it for the server to pick.
 */
function parseEntry(input) {
  object(input, "The entry");
  const source = parseSource(input.source);
  let sec;
  if (source) {
    sec = COLLECTION_SECTION[source.collection];
    if (input.section !== undefined && input.section !== sec)
      throw invalid(`A linked ${source.collection} item belongs in ${sec}.`);
  } else {
    sec = section(input.section);
  }
  if (input.show !== undefined && typeof input.show !== "boolean")
    throw invalid("Show must be true or false.");
  const fields = parseFields(input.fields, sec);
  const [required, requiredName] = REQUIRED_FIELD[sec];
  if (!source && !fields[required]) throw invalid(`A CV-only ${sec} entry needs ${requiredName}.`);
  if (input.sourceNotes && (sec !== "projects" || source))
    throw invalid("Notes for drafting are only for CV-only projects.");
  return {
    section: sec,
    source,
    show: input.show ?? true,
    order: parseOrder(input.order),
    fields,
    approved: parseApproved(input.approved, sec),
    sourceNotes: paragraph(input.sourceNotes, "Notes for drafting", SOURCE_NOTES_MAX),
  };
}

function parseReorder(input) {
  const sec = section(input.section);
  const ids = list(input.ids, "The new order", MAX_SECTION_ENTRIES).map(entryId);
  if (new Set(ids).size !== ids.length) throw invalid("The new order lists an entry twice.");
  return { section: sec, ids };
}

/** An entry id: `key` is the linked site record id, or "cv-<new id>" for a CV-only entry. */
function entryIdFor(sec, key) {
  return `entry.${sec}.${key}`;
}

module.exports = {
  PROFILE_ID,
  VERSION_ID,
  SECTIONS,
  SECTION_COLLECTION,
  COLLECTION_SECTION,
  SECTION_FIELDS,
  TEXT_SECTIONS,
  MAX_SECTION_ENTRIES,
  DEFAULT_REFERENCES,
  entryId,
  entryIdFor,
  parseProfile,
  parseEntry,
  parseReorder,
};
