// Atomic locks: a document whose id is derived from the lock key. Creating a
// document with an id that already exists fails with 409, so exactly one
// caller wins even when the webhook, the return page and polling race.
//
// Policy: locks have no TTL. Callers must release on error (settle does). If
// the process crashes between take() and release(), the lock is stranded. A
// stranded stage lock also blocks manual recording of that stage. Recovery is
// deleting the lock row in the Appwrite console (locks table, id = "s_" plus a
// sha256 prefix of the key), or in the Cosmos `locks` container once
// DATA_BACKEND=cosmos. Both use the same id, so imported locks keep holding.

const { sdk, DATABASE_ID } = require("./appwrite");
const { lockId } = require("./tokens");

const LOCKS = "locks";
const PAGE = 100;

function createLocks(db) {
  return {
    async take(key) {
      try {
        await db.createDocument(DATABASE_ID, LOCKS, lockId(key), { key: key.slice(0, 200) });
        return true;
      } catch (err) {
        if (err && err.code === 409) return false;
        throw err;
      }
    },
    // True when this call deleted the row, false when it was already gone.
    async release(key) {
      try {
        await db.deleteDocument(DATABASE_ID, LOCKS, lockId(key));
        return true;
      } catch (err) {
        if (err && err.code === 404) return false;
        throw err;
      }
    },
    // Locks created before `beforeIso`, oldest first, as { key, createdAt },
    // at most `cap` of them. For retention clean-up (quotes/access.js).
    async listBefore(beforeIso, cap = 5000) {
      const { Query } = sdk;
      const rows = [];
      let cursor = null;
      while (rows.length < cap) {
        const limit = Math.min(PAGE, cap - rows.length);
        const queries = [
          Query.lessThan("$createdAt", beforeIso),
          Query.orderAsc("$createdAt"),
          Query.limit(limit),
        ];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const { documents } = await db.listDocuments(DATABASE_ID, LOCKS, queries);
        for (const d of documents) rows.push({ key: d.key, createdAt: d.$createdAt });
        if (documents.length < limit) break;
        cursor = documents[documents.length - 1].$id;
      }
      return rows;
    },
    // Read-only: whether the lock is held. take() can't answer this without
    // creating the row, which would change the answer for every other caller.
    async has(key) {
      try {
        await db.getDocument(DATABASE_ID, LOCKS, lockId(key));
        return true;
      } catch (err) {
        if (err && err.code === 404) return false;
        throw err;
      }
    },
  };
}

// The same locks on Cosmos. The container is partitioned by id, and an id
// that exists already fails the create with 409, as in Appwrite.
//
// The quote access rules (5 tries, single-use codes, epochs) need a create to
// conflict with every earlier create and a read to see the caller's own
// writes. That holds on Session or Strong consistency, with one client per
// process (getDatabase() in cosmos.js) so the session token is reused. The
// account must not be set to Eventual or Consistent Prefix.
//
// `now` stamps createdAt, which listBefore reads; tests pass a clock.
function createCosmosLocks(db, { now = () => Date.now() } = {}) {
  const container = db.container(LOCKS);
  return {
    async take(key) {
      try {
        await container.items.create({
          id: lockId(key),
          key: key.slice(0, 200),
          createdAt: new Date(now()).toISOString(),
        });
        return true;
      } catch (err) {
        if (err && err.code === 409) return false;
        throw err;
      }
    },
    // True when this call deleted the row, false when it was already gone.
    async release(key) {
      const id = lockId(key);
      try {
        await container.item(id, id).delete();
        return true;
      } catch (err) {
        if (err && err.code === 404) return false;
        throw err;
      }
    },
    // As listBefore above. Imported rows carry Appwrite's $createdAt as
    // createdAt (toCosmos), so they age out on the same clock.
    async listBefore(beforeIso, cap = 5000) {
      const top = Math.floor(cap);
      if (!(top >= 1)) return [];
      const { resources } = await container.items
        .query({
          query: `SELECT TOP ${top} * FROM c WHERE c.createdAt < @before ORDER BY c.createdAt ASC`,
          parameters: [{ name: "@before", value: beforeIso }],
        })
        .fetchAll();
      return resources.map((d) => ({ key: d.key, createdAt: d.createdAt }));
    },
    // Read-only, as has() above. The SDK resolves a missing item as
    // { resource: undefined } and throws for anything else.
    async has(key) {
      const id = lockId(key);
      const { resource } = await container.item(id, id).read();
      return resource !== undefined;
    },
  };
}

module.exports = { createLocks, createCosmosLocks };
