// Sequential document numbers (Q-2026-0007, INV-2026-0008) on Cosmos DB.
//
// Unique keys only apply inside one partition, and these containers are
// partitioned by id, so each number is reserved through a lock row
// (shared/locks.js, key `<field>:<number>`) before the row is written. Two
// creates at once read the same highest number, but only one of them takes
// each lock; the other moves on to the next number.

// Numbers already held are skipped quickly (the lock create answers 409), so
// a generous cap keeps creates working even when earlier writes left held
// numbers behind (see below). Any saved row moves the start past them.
const ATTEMPTS = 50;

// A write may have been saved after a timeout, a 408/449, a 5xx or a network
// error (string codes such as ECONNRESET, or none). Its number stays held so
// it can't be handed out twice; a gap in the sequence is the safer cost. Any
// other refusal (400, 401, 403, 404, 409, 413, 429...) wrote nothing and frees
// the number. Recovery for a held number with no row: delete the `locks` row
// for the key "<field>:<number>" (see locks.js).
function mayHaveBeenSaved(err) {
  const code = err && err.code;
  if (typeof code !== "number") return true;
  return code === 408 || code === 449 || code >= 500;
}

/**
 * Writes a new row whose `field` is the next number after the highest one
 * starting with `prefix`, and returns the row as stored.
 *
 * `format(seq)` turns a sequence into a number and must start with `prefix`.
 * `build(number)` returns the document to create. Gives up with
 * `Could not allocate a(n) <label>` after 50 numbers that are already held.
 */
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
    let doc;
    try {
      doc = build(number);
    } catch (err) {
      await locks.release(key).catch(() => {});
      throw err;
    }
    try {
      const { resource } = await container.items.create(doc);
      return resource;
    } catch (err) {
      // The write error matters more than a failed release.
      if (!mayHaveBeenSaved(err)) await locks.release(key).catch(() => {});
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
