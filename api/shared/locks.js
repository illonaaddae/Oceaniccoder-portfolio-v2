// Atomic locks: a row in the Cosmos `locks` container whose id is derived
// from the lock key. Creating a row with an id that already exists fails with
// 409, so exactly one caller wins even when the webhook, the return page and
// polling race.
//
// Policy: locks have no TTL. Callers must release on error (settle does);
// number allocation (numbering.js) keeps a number held when a write may have
// been saved, and documents how to free it. If the process crashes between
// take() and release(), the lock is stranded. A stranded stage lock also blocks manual recording of that stage. Recovery is
// deleting the row in the Cosmos `locks` container (id = "s_" plus a sha256
// prefix of the key). Rows imported from Appwrite use the same id, so they
// keep holding.
//
// The Paystack webhook's `alert:<reference>` locks are kept on purpose once
// their email went: they stop a second alert for the same payment and carry
// its notes (firstFailedAt, escalatedAt, recorded). They are released only
// when the alert email fails, and nothing deletes them later; there is one
// small row per payment that ever failed.

const { lockId } = require("./tokens");

const LOCKS = "locks";

// The container is partitioned by id, so the id alone decides the conflict.
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
    // Locks created before `beforeIso`, oldest first, as { key, createdAt },
    // at most `cap` of them. For retention clean-up (quotes/access.js).
    // Imported rows carry Appwrite's $createdAt as createdAt (toCosmos), so
    // they age out on the same clock.
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
    // Read-only: whether the lock is held. take() can't answer this without
    // creating the row, which would change the answer for every other caller.
    // The SDK resolves any 404 as
    // { resource: undefined } and throws for anything else. A 404 with
    // substatus 1002 (read session not available) is a lagging replica, not
    // a missing lock: answering "absent" would let a revoked session or a
    // locked-out quote through, so it throws instead.
    async has(key) {
      const id = lockId(key);
      const { resource, substatus } = await container.item(id, id).read();
      if (resource === undefined && substatus === 1002) {
        throw new Error("Lock read failed: Cosmos read session not available (404/1002)");
      }
      return resource !== undefined;
    },
  };
}

module.exports = { createCosmosLocks };
