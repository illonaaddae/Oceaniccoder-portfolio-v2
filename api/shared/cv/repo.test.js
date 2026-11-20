// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createSiteReader, createCosmosCvRepo } = await import("./repo.js");
const { createFakeCosmos } = await import("../fakeCosmos.js");

describe("createSiteReader", () => {
  it("reads the four linked collections in the site's shape, with only the CV's fields", async () => {
    const db = createFakeCosmos();
    db.container("journey").seed({
      id: "j1",
      createdAt: "2025-11-01T00:00:00.000Z",
      updatedAt: "2025-11-02T00:00:00.000Z",
      role: "Software Engineer",
      company: "Brightpath Software",
      logo: "https://example.com/logo.png",
    });
    db.container("projects").seed({ id: "p1", title: "Clinic Scheduler", screenshots: ["a.png"] });
    const records = await createSiteReader({ database: () => db })();
    expect(records).toEqual({
      education: [],
      journey: [
        {
          $id: "j1",
          $createdAt: "2025-11-01T00:00:00.000Z",
          role: "Software Engineer",
          company: "Brightpath Software",
        },
      ],
      projects: [{ $id: "p1", $createdAt: undefined, title: "Clinic Scheduler" }],
      certifications: [],
    });
  });
});

describe("createCosmosCvRepo", () => {
  it("guards writes with its own version document in the 'me' partition", async () => {
    const batch = vi.fn(async (operations) => ({
      result: operations.map(() => ({ statusCode: 200 })),
    }));
    const repo = createCosmosCvRepo({ container: async () => ({ items: { batch } }) });
    await repo.write({ create: [{ id: "profile" }] }, null);
    const [operations, partitionKey] = batch.mock.calls[0];
    expect(partitionKey).toBe("me");
    expect(operations[0]).toMatchObject({
      operationType: "Create",
      resourceBody: { id: "cv-version", scope: "me", kind: "version" },
    });
  });
});
