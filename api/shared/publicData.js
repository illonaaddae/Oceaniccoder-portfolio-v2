// What visitors may read from Cosmos, and how a list request becomes a query.
// Used by /api/data. No Cosmos calls here, so it's unit-tested on its own.
//
// Request shape (all optional):
//   ?where={"featured":true,"slug":"my-post"}   equality filters, JSON values
//   &orderBy=$createdAt&dir=desc                sort
//   &limit=100
//
// Only collections in PUBLIC_COLLECTIONS are readable. Each can hide rows
// (drafts, hidden images, unapproved comments) and fields (commenter emails)
// on the server, so a visitor can't get them by editing the request.

const { MIGRATED_SETTINGS_KEYS } = require("./cosmos");

const FIELD_NAME = /^\$?[A-Za-z][A-Za-z0-9_]*$/;
const MAX_LIMIT = 500;

// Appwrite system fields → Cosmos document fields (see toCosmos in cosmos.js).
const SYSTEM_FIELDS = { $id: "id", $createdAt: "createdAt", $updatedAt: "updatedAt" };

/** SQL that keeps a row unless `field` is explicitly false (missing = shown). */
const unlessFalse = (field) => `NOT (IS_BOOLEAN(c.${field}) AND c.${field} = false)`;

const PUBLIC_COLLECTIONS = {
  about: {},
  blog_posts: { where: unlessFalse("published") },
  certifications: {},
  comments: { where: unlessFalse("isApproved"), omit: ["authorEmail"] },
  education: { where: unlessFalse("isVisible") },
  gallery: { where: unlessFalse("isPublic") },
  journey: {},
  project_case_studies: {},
  project_videos: {},
  projects: {},
  settings: { keys: [...MIGRATED_SETTINGS_KEYS] },
  skills: {},
  testimonials: {},
};

class BadRequest extends Error {}

function cosmosField(name) {
  if (!FIELD_NAME.test(name)) throw new BadRequest(`Invalid field name: ${name}`);
  return SYSTEM_FIELDS[name] || name;
}

/** Validates the query string. Throws BadRequest on anything unexpected. */
function parseListQuery(query = {}) {
  const where = [];
  if (query.where) {
    let parsed;
    try {
      parsed = JSON.parse(query.where);
    } catch {
      throw new BadRequest("where must be a JSON object");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new BadRequest("where must be a JSON object");
    }
    for (const [name, value] of Object.entries(parsed)) {
      if (value === null || typeof value === "object") {
        throw new BadRequest(`where.${name} must be a string, number or boolean`);
      }
      where.push({ field: cosmosField(name), value });
    }
  }

  const orderBy = query.orderBy ? cosmosField(query.orderBy) : null;
  const dir = query.dir === "desc" ? "desc" : "asc";

  let limit = null;
  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1)
      throw new BadRequest("limit must be a positive integer");
    limit = Math.min(limit, MAX_LIMIT);
  }

  return { where, orderBy, dir, limit };
}

/** Parameterised Cosmos SQL for one collection's visible rows. */
function buildQuery(collection, { where = [] } = {}, id) {
  const rule = PUBLIC_COLLECTIONS[collection];
  const clauses = [];
  const parameters = [];

  if (rule.where) clauses.push(rule.where);
  if (rule.keys) {
    clauses.push("ARRAY_CONTAINS(@publicKeys, c.key)");
    parameters.push({ name: "@publicKeys", value: rule.keys });
  }
  if (id !== undefined) {
    clauses.push("c.id = @id");
    parameters.push({ name: "@id", value: id });
  }
  where.forEach(({ field, value }, i) => {
    clauses.push(`c["${field}"] = @p${i}`);
    parameters.push({ name: `@p${i}`, value });
  });

  const filter = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  return { query: `SELECT * FROM c${filter}`, parameters };
}

// Missing values sort first ascending and last descending, like Appwrite.
// Sorting here instead of ORDER BY because Cosmos ORDER BY drops documents
// that don't have the field at all; collections are at most a few hundred rows.
function sortRows(rows, field, dir) {
  if (!field) return rows;
  const sign = dir === "desc" ? -1 : 1;
  const missing = (v) => v === undefined || v === null;
  return [...rows].sort((a, b) => {
    const x = a[field];
    const y = b[field];
    if (missing(x) || missing(y)) return missing(x) === missing(y) ? 0 : missing(x) ? -sign : sign;
    return x < y ? -sign : x > y ? sign : 0;
  });
}

/** Removes fields visitors must not see. */
function stripPrivate(collection, row) {
  const omit = PUBLIC_COLLECTIONS[collection].omit;
  if (!omit) return row;
  const copy = { ...row };
  for (const field of omit) delete copy[field];
  return copy;
}

module.exports = {
  PUBLIC_COLLECTIONS,
  BadRequest,
  parseListQuery,
  buildQuery,
  sortRows,
  stripPrivate,
};
