// Atomic locks: a document whose id is derived from the lock key. Creating a
// document with an id that already exists fails with 409, so exactly one
// caller wins even when the webhook, the return page and polling race.
//
// Policy: locks have no TTL. Callers must release on error (settle does). If
// the process crashes between take() and release(), the lock is stranded. A
// stranded stage lock also blocks manual recording of that stage. Recovery is
// deleting the lock row in the Appwrite console (locks table, id = "s_" plus a
// sha256 prefix of the key).

const { DATABASE_ID } = require("./appwrite");
const { lockId } = require("./tokens");

const LOCKS = "locks";

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
    async release(key) {
      try {
        await db.deleteDocument(DATABASE_ID, LOCKS, lockId(key));
      } catch (err) {
        if (!(err && err.code === 404)) throw err;
      }
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

module.exports = { createLocks };
