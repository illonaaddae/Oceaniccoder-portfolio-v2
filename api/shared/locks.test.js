// @vitest-environment node
import { describe, it, expect } from "vitest";

const { createLocks, createCosmosLocks } = await import("./locks.js");
const { createFakeCosmos } = await import("./fakeCosmos.js");
const { createFakeLocks } = await import("./quotes/fakes.js");
const { lockId } = await import("./tokens.js");

// Enough of node-appwrite's Databases for createLocks: ids conflict with 409,
// missing rows are 404, and listDocuments reads the JSON queries node-appwrite
// builds (lessThan, orderAsc on $createdAt, limit, cursorAfter).
function createFakeAppwriteLocksDb(now) {
  const rows = new Map();
  const appwriteError = (code) => Object.assign(new Error(`appwrite ${code}`), { code });
  return {
    async createDocument(_db, _table, id, data) {
      if (rows.has(id)) throw appwriteError(409);
      rows.set(id, { $id: id, $createdAt: new Date(now()).toISOString(), ...data });
      return rows.get(id);
    },
    async deleteDocument(_db, _table, id) {
      if (!rows.delete(id)) throw appwriteError(404);
    },
    async getDocument(_db, _table, id) {
      if (!rows.has(id)) throw appwriteError(404);
      return rows.get(id);
    },
    async listDocuments(_db, _table, queries) {
      const q = Object.fromEntries(
        queries.map((text) => JSON.parse(text)).map((x) => [x.method, x]),
      );
      let docs = [...rows.values()]
        .filter((d) => d.$createdAt < q.lessThan.values[0])
        .sort((a, b) => (a.$createdAt < b.$createdAt ? -1 : 1));
      if (q.cursorAfter)
        docs = docs.slice(docs.findIndex((d) => d.$id === q.cursorAfter.values[0]) + 1);
      return { documents: docs.slice(0, q.limit.values[0]) };
    },
  };
}

const BACKENDS = [
  ["Appwrite", (now) => createLocks(createFakeAppwriteLocksDb(now))],
  ["the in-memory fake", (now) => createFakeLocks({ now })],
  ["Cosmos", (now) => createCosmosLocks(createFakeCosmos(), { now })],
];

describe.each(BACKENDS)("locks contract on %s", (_name, makeLocks) => {
  const T0 = Date.parse("2026-10-20T09:00:00.000Z");
  const clockAt = () => {
    const clock = { ms: T0 };
    return { clock, locks: makeLocks(() => clock.ms) };
  };

  it("takes a lock once, and release reports whether it deleted one", async () => {
    const { locks } = clockAt();
    expect(await locks.take("qa:try:c1:1")).toBe(true);
    expect(await locks.take("qa:try:c1:1")).toBe(false);
    expect(await locks.release("qa:try:c1:1")).toBe(true);
    expect(await locks.release("qa:try:c1:1")).toBe(false);
    expect(await locks.take("qa:try:c1:1")).toBe(true);
  });

  it("answers has without creating the lock", async () => {
    const { locks } = clockAt();
    expect(await locks.has("qa:epoch:q1:1:1")).toBe(false);
    expect(await locks.take("qa:epoch:q1:1:1")).toBe(true);
    expect(await locks.has("qa:epoch:q1:1:1")).toBe(true);
    await locks.release("qa:epoch:q1:1:1");
    expect(await locks.has("qa:epoch:q1:1:1")).toBe(false);
  });

  it("lets exactly one of many parallel takes win", async () => {
    const { locks } = clockAt();
    const results = await Promise.all(Array.from({ length: 10 }, () => locks.take("qa:used:c1")));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("lists locks created strictly before a time, oldest first, up to the cap", async () => {
    const { clock, locks } = clockAt();
    for (const key of ["qa:send:a", "qa:send:b", "qa:send:c"]) {
      await locks.take(key);
      clock.ms += 1000;
    }
    const at = (ms) => new Date(ms).toISOString();
    expect(await locks.listBefore(at(T0 + 2000))).toEqual([
      { key: "qa:send:a", createdAt: at(T0) },
      { key: "qa:send:b", createdAt: at(T0 + 1000) },
    ]);
    expect((await locks.listBefore(at(T0 + 5000), 2)).map((row) => row.key)).toEqual([
      "qa:send:a",
      "qa:send:b",
    ]);
    expect(await locks.listBefore(at(T0))).toEqual([]);
  });
});

describe("Cosmos locks", () => {
  it("takes a lock once until it is released", async () => {
    const db = createFakeCosmos();
    const locks = createCosmosLocks(db);
    expect(await locks.take("settle:R1")).toBe(true);
    expect(await locks.take("settle:R1")).toBe(false);
    await locks.release("settle:R1");
    expect(await locks.take("settle:R1")).toBe(true);
  });

  it("uses the Appwrite lock id, so imported locks still hold", async () => {
    const db = createFakeCosmos();
    const id = lockId("stage:q1:s1");
    db.container("locks").seed({ id, key: "stage:q1:s1" });
    const locks = createCosmosLocks(db);
    expect(await locks.take("stage:q1:s1")).toBe(false);
    expect(await locks.take("stage:q1:s2")).toBe(true);
    expect(db.container("locks").docs.get(lockId("stage:q1:s2"))).toMatchObject({
      key: "stage:q1:s2",
    });
  });

  it("tolerates releasing a lock that is not held", async () => {
    const locks = createCosmosLocks(createFakeCosmos());
    await expect(locks.release("never-taken")).resolves.toBe(false);
  });

  it("rethrows errors other than 409 on take, 404 on release and a missing read", async () => {
    const db = createFakeCosmos();
    const container = db.container("locks");
    container.hooks.beforeCreate = async () => {
      throw Object.assign(new Error("throttled"), { code: 429 });
    };
    const locks = createCosmosLocks(db);
    await expect(locks.take("k")).rejects.toThrow("throttled");

    const down = {
      container: () => ({
        item: () => ({
          delete: async () => {
            throw Object.assign(new Error("down"), { code: 503 });
          },
        }),
      }),
    };
    await expect(createCosmosLocks(down).release("k")).rejects.toThrow("down");

    container.hooks.beforeRead = async () => {
      throw Object.assign(new Error("read failed"), { code: 503 });
    };
    await expect(locks.has("k")).rejects.toThrow("read failed");

    // A lagging replica answers 404/1002: that is not "no lock".
    const lagging = {
      container: () => ({
        item: () => ({
          read: async () => ({ resource: undefined, statusCode: 404, substatus: 1002 }),
        }),
      }),
    };
    await expect(createCosmosLocks(lagging).has("k")).rejects.toThrow("read session not available");
  });
});
