// @vitest-environment node
// access.test.js again, with createFakeLocks swapped for the real Cosmos locks
// over the in-memory Cosmos fake, so both backends pass the access rules.
import { vi } from "vitest";

vi.mock("./fakes.js", async (importOriginal) => {
  const fakes = await importOriginal();
  return { ...fakes, createFakeLocks: fakes.createFakeCosmosLocks };
});

await import("./access.test.js");
