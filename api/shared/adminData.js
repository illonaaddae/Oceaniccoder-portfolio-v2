// Request checks for /api/manage, the admin's full read/write access to every
// container. No Cosmos calls here, so it's unit-tested on its own.

const { CONTAINERS } = require("./cosmos");

const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
// Set by the server, never by the request body.
const SYSTEM_FIELDS = new Set(["id", "createdAt", "updatedAt"]);
const MAX_BODY_BYTES = 1024 * 1024; // Cosmos caps a document at 2 MB

class Invalid extends Error {}

/**
 * Containers the admin edits. Cosmos-only ones (analytics: raw page views,
 * partitioned by day with a TTL) and `manage: false` ones (quotes, locks:
 * tokens and payment state) are written and read by their own Functions.
 */
function isCollection(name) {
  if (!Object.hasOwn(CONTAINERS, name)) return false;
  const { imported, manage } = CONTAINERS[name];
  return imported !== false && manage !== false;
}

// Money records. The admin hides one by archiving it through
// /api/quote-admin, which checks paid status first, never by deleting it.
const NOT_DELETABLE = new Set(["payments", "invoices"]);
// Archived only through /api/quote-admin, never by a plain PATCH.
const ARCHIVED_ELSEWHERE = new Set(["payments", "invoices"]);
// Written once, when the payment is recorded.
const CREATE_ONLY = new Set(["payments"]);

function canDelete(collection) {
  return !NOT_DELETABLE.has(collection);
}

/** Why /api/manage refuses this write (answered with 405), or null. */
function refusedWrite(method, collection, body) {
  const label = collection.charAt(0).toUpperCase() + collection.slice(1);
  if (method === "DELETE" && !canDelete(collection)) {
    return `${label} can't be deleted. Archive them instead.`;
  }
  if (method !== "PATCH") return null;
  if (CREATE_ONLY.has(collection)) return `${label} can't be changed once recorded.`;
  const setsArchive = body && typeof body === "object" && Object.hasOwn(body, "archivedAt");
  if (setsArchive && ARCHIVED_ELSEWHERE.has(collection)) {
    return `${label} are archived from their own tab, which checks paid status.`;
  }
  return null;
}

/** The field a container is partitioned on ("/postId" → "postId"). */
function partitionField(collection) {
  return CONTAINERS[collection].partitionKey.slice(1);
}

/**
 * The fields to write, from a create or update body. Appwrite-style `$`
 * fields and Cosmos `_` fields are dropped (the browser sends rows back as it
 * read them); anything else must be a plain field name.
 */
function writableFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Invalid("Body must be a JSON object");
  }
  if (Buffer.byteLength(JSON.stringify(body)) > MAX_BODY_BYTES) {
    throw new Invalid("Body is too large");
  }
  const fields = {};
  for (const [name, value] of Object.entries(body)) {
    if (name.startsWith("$") || name.startsWith("_") || SYSTEM_FIELDS.has(name)) continue;
    if (!FIELD_NAME.test(name)) throw new Invalid(`Invalid field name: ${name}`);
    if (value !== undefined) fields[name] = value;
  }
  return fields;
}

/** Parameterised SQL for every row (no visibility rules), optionally one id. */
function buildAdminQuery({ where = [] } = {}, id) {
  const clauses = [];
  const parameters = [];
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

/** Writes must be JSON: a cross-site form can't send that without CORS. */
function isJsonRequest(req) {
  const type = (req.headers && req.headers["content-type"]) || "";
  return type.toLowerCase().startsWith("application/json");
}

module.exports = {
  Invalid,
  isCollection,
  canDelete,
  refusedWrite,
  partitionField,
  writableFields,
  buildAdminQuery,
  isJsonRequest,
};
