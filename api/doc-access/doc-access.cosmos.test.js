// @vitest-environment node
// doc-access.test.js again, with createFakeLocks swapped for the real Cosmos
// locks over the in-memory Cosmos fake, so the new ia: rows and the receipts'
// shared qa: rows behave the same on both backends.
import { vi } from "vitest";

vi.mock("../shared/quotes/fakes.js", async (importOriginal) => {
  const fakes = await importOriginal();
  return { ...fakes, createFakeLocks: fakes.createFakeCosmosLocks };
});

await import("./doc-access.test.js");
