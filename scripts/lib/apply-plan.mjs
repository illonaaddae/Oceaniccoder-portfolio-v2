// Writes an import plan (import-plan.mjs) to one Cosmos container. Kept apart
// from scripts/import-to-cosmos.mjs so the write order and the 409 handling
// are unit-tested against a stub container (apply-plan.test.mjs).

import { uniqueKeyQuery } from "./import-plan.mjs";

export const isCode = (err, code) => Boolean(err) && err.code === code;

// Real Cosmos answers 404 (substatus 1003) for a container that doesn't
// exist; the Linux emulator answers 400 with substatus 1003.
export function isMissingContainer(err) {
  return isCode(err, 404) || (isCode(err, 400) && err.substatus === 1003);
}

/** The rows holding `doc`'s unique key, or null when none is found. */
async function findClash(id, container, doc) {
  const query = uniqueKeyQuery(id, doc);
  if (!query) return null;
  // Can't look the holder up without the key's value.
  if (query.missingFields) return { id: doc.id, missingFields: query.missingFields };
  const { resources } = await container.items.query(query).fetchAll();
  return resources.length > 0 ? { id: doc.id, holders: resources.map((r) => r.id) } : null;
}

/**
 * Prunes, creates, then overwrites. Returns { raced, clashes }: `raced`
 * counts creates whose id a live function wrote meanwhile (that row is kept);
 * each clash is a backup row not written because another row holds its
 * unique key ({ id, write, holders } or { id, write, missingFields }).
 */
export async function applyPlan(id, container, plan) {
  const outcome = { raced: 0, clashes: [] };
  // Sequential on purpose: ~200 small documents, and the free tier's
  // 1,000 RU/s is shared by every container. The SDK retries 429s itself.
  // Prune first: a stale row can hold the unique key a backup row needs.
  for (const row of plan.prune) await container.item(row.id, row.pk).delete();
  for (const doc of plan.create) {
    try {
      await container.items.create(doc);
    } catch (err) {
      if (!isCode(err, 409)) throw err;
      const clash = await findClash(id, container, doc);
      if (clash) outcome.clashes.push({ ...clash, write: "create" });
      else outcome.raced += 1;
    }
  }
  for (const doc of plan.overwrite) {
    try {
      await container.items.upsert(doc);
    } catch (err) {
      // The id exists, so a 409 here can only be a unique-key clash.
      if (!isCode(err, 409)) throw err;
      const clash = await findClash(id, container, doc);
      outcome.clashes.push({ id: doc.id, holders: [], ...clash, write: "overwrite" });
    }
  }
  return outcome;
}
