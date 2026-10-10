// Atomic locks: a document whose id is derived from the lock key. Creating a
// document with an id that already exists fails with 409, so exactly one
// caller wins even when the webhook, the return page and polling race.

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
  };
}

module.exports = { createLocks };
