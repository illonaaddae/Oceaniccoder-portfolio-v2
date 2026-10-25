// Sequential document numbers (Q-2026-0007, INV-2026-0008) on Cosmos DB.
//
// Unique keys only apply inside one partition, and these containers are
// partitioned by id, so each number is reserved through a lock row
// (shared/locks.js, key `<field>:<number>`) before the row is written. Two
// creates at once read the same highest number, but only one of them takes
// each lock; the other moves on to the next number.

const ATTEMPTS = 5;

/**
 * Writes a new row whose `field` is the next number after the highest one
 * starting with `prefix`, and returns the row as stored.
 *
 * `format(seq)` turns a sequence into a number and must start with `prefix`.
 * `build(number)` returns the document to create. Gives up with
 * `Could not allocate a(n) <label>` after five taken numbers.
 */
// Cosmos status codes that mean the create was not written.
const DEFINITE_REJECTIONS = new Set([400, 403, 409, 413, 429]);

async function createWithNextNumber(container, locks, { field, prefix, format, build, label }) {
  const { resources } = await container.items
    .query({
      query: `SELECT TOP 1 c.${field} FROM c WHERE STARTSWITH(c.${field}, @prefix) ORDER BY c.${field} DESC`,
      parameters: [{ name: "@prefix", value: prefix }],
    })
    .fetchAll();
  const start = resources.length ? sequenceOf(resources[0][field], prefix, label) + 1 : 1;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const number = format(start + attempt);
    const key = `${field}:${number}`;
    if (!(await locks.take(key))) continue;
    try {
      const { resource } = await container.items.create(build(number));
      return resource;
    } catch (err) {
      // Free the number only when the write was certainly refused. A timeout
      // or a 5xx may still have saved the row, and freeing its number then
      // could hand it out twice; a gap in the sequence is the safer cost. The
      // write error matters more than a failed release.
      if (DEFINITE_REJECTIONS.has(err && err.code)) await locks.release(key).catch(() => {});
      throw err;
    }
  }
  const article = /^[aeiou]/i.test(label) ? "an" : "a";
  throw new Error(`Could not allocate ${article} ${label}`);
}

// A hand-edited number such as "INV-2026-12a" would otherwise give NaN and a
// row numbered "INV-2026-NaN".
function sequenceOf(number, prefix, label) {
  const seq = Number(number.slice(prefix.length));
  if (!Number.isSafeInteger(seq) || seq < 0) {
    throw new Error(`Can't continue the ${label} sequence after ${number}`);
  }
  return seq;
}

module.exports = { createWithNextNumber };
