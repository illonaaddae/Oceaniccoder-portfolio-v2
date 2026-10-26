// Point reads and etag-checked updates on Cosmos containers partitioned by
// id. Shared by the quote repo (quotes/repo.cosmos.js) and the webhook's
// invoice store (invoices/store.cosmos.js), so both retry the same way.

const SYSTEM_FIELDS = ["_rid", "_self", "_etag", "_attachments", "_ts"];
// The first replace plus three retries when the etag no longer matches.
const MAX_REPLACE_ATTEMPTS = 4;
// Up to this many milliseconds of random wait before a retry, so two writers
// that collided do not reread and collide again in lockstep.
const RETRY_JITTER_MS = 50;

const isCode = (err, code) => Boolean(err) && err.code === code;

function withoutSystemFields(doc) {
  const out = { ...doc };
  for (const key of SYSTEM_FIELDS) delete out[key];
  return out;
}

function notFound(id) {
  return Object.assign(new Error(`Document not found: ${id}`), { code: 404 });
}

// The SDK resolves a missing item with an undefined resource; older versions
// threw 404.
async function readById(container, id) {
  if (typeof id !== "string" || !id) return null;
  try {
    const { resource } = await container.item(id, id).read();
    return resource || null;
  } catch (err) {
    if (isCode(err, 404)) return null;
    throw err;
  }
}

/**
 * Read, decide, replace if nobody changed the row meanwhile.
 * `decide(current)` returns the fields to change, or null to leave the row
 * alone. Resolves { doc, changed } with the row as stored. A missing row
 * throws 404; a 412 on the last attempt is rethrown.
 */
async function updateWith(container, id, decide, { now = () => new Date() } = {}) {
  for (let attempt = 1; ; attempt++) {
    const current = await readById(container, id);
    if (!current) throw notFound(id);
    const changes = decide(current);
    if (!changes) return { doc: current, changed: false };
    try {
      const { resource } = await container
        .item(id, id)
        .replace(
          { ...withoutSystemFields(current), ...changes, updatedAt: now().toISOString() },
          { accessCondition: { type: "IfMatch", condition: current._etag } },
        );
      return { doc: resource, changed: true };
    } catch (err) {
      if (!isCode(err, 412) || attempt >= MAX_REPLACE_ATTEMPTS) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.random() * RETRY_JITTER_MS));
  }
}

module.exports = {
  isCode,
  withoutSystemFields,
  notFound,
  readById,
  updateWith,
  MAX_REPLACE_ATTEMPTS,
  RETRY_JITTER_MS,
};
