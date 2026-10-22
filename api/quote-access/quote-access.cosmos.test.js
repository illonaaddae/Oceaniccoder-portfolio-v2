// @vitest-environment node
// quote-access.test.js again, with createFakeLocks swapped for the real Cosmos
// locks over the in-memory Cosmos fake, so both backends pass the access rules.
import { vi } from "vitest";

vi.mock("../shared/quotes/fakes.js", async (importOriginal) => {
  const fakes = await importOriginal();
  return { ...fakes, createFakeLocks: fakes.createFakeCosmosLocks };
});

await import("./quote-access.test.js");
