// @vitest-environment node
// The allocation itself (sequence, locks, concurrent creates, give-up) is
// covered through its callers: quotes/repo.cosmos.test.js and
// invoices/numbers.test.js.
import { describe, it, expect } from "vitest";

const { createWithNextNumber } = await import("./numbering.js");
const { createCosmosLocks } = await import("./locks.js");
const { createFakeCosmos } = await import("./fakeCosmos.js");

function create(db, seeded) {
  const container = db.container("things");
  container.seed({ id: "a", thingNumber: seeded });
  return createWithNextNumber(container, createCosmosLocks(db), {
    field: "thingNumber",
    prefix: "T-",
    format: (seq) => `T-${seq}`,
    build: (number) => ({ id: "b", thingNumber: number }),
    label: "thing number",
  });
}

describe("createWithNextNumber", () => {
  it("counts on from the highest number with the prefix", async () => {
    expect((await create(createFakeCosmos(), "T-41")).thingNumber).toBe("T-42");
  });

  it("refuses to continue after a number that isn't a count", async () => {
    const db = createFakeCosmos();
    await expect(create(db, "T-12a")).rejects.toThrow(
      "Can't continue the thing number sequence after T-12a",
    );
    expect(db.container("things").docs.size).toBe(1);
  });
});
