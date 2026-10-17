// @vitest-environment node
import { describe, it, expect } from "vitest";

const { createCosmosLocks } = await import("./locks.js");
const { createFakeCosmos } = await import("./fakeCosmos.js");
const { lockId } = await import("./tokens.js");

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
    await expect(locks.release("never-taken")).resolves.toBeUndefined();
  });

  it("rethrows errors other than 409 on take and 404 on release", async () => {
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
  });
});
