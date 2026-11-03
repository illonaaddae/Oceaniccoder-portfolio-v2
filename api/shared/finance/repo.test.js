// @vitest-environment node
// How the Cosmos finance repo talks to Cosmos: the version read, the IfMatch
// on the version bump, and which batch failures become which errors.
import { describe, it, expect, vi } from "vitest";

const { createCosmosFinanceRepo, VERSION_ID } = await import("./repo.js");

function stubContainer({ version, batchResult = [], batchThrows, etagsAfter } = {}) {
  let thrown = false;
  const batch = vi.fn(async (operations) => {
    if (batchThrows) {
      thrown = true;
      throw batchThrows;
    }
    return {
      result: batchResult.length ? batchResult : operations.map(() => ({ statusCode: 200 })),
    };
  });
  // Etags as Cosmos would report them, before and after the failed batch.
  const etagOf = (id) =>
    thrown && etagsAfter ? etagsAfter[id] : id === VERSION_ID ? version : undefined;
  const container = {
    item: vi.fn((id) => ({
      read: async () => {
        const etag = etagOf(id);
        if (!etag) throw Object.assign(new Error("Not found"), { code: 404 });
        return { resource: { id, _etag: etag } };
      },
    })),
    items: {
      query: vi.fn(() => ({
        fetchAll: async () => ({
          resources: [{ id: "f1", scope: "me", kind: "fund", _etag: '"x"', _ts: 1 }],
        }),
      })),
      batch,
    },
  };
  return { container, batch, repo: createCosmosFinanceRepo({ container: async () => container }) };
}

describe("Cosmos finance repo", () => {
  it("reads the version etag and the ledger without system fields", async () => {
    const { repo } = stubContainer({ version: '"v7"' });
    expect(await repo.read()).toEqual({
      docs: [{ id: "f1", scope: "me", kind: "fund" }],
      version: '"v7"',
    });
  });

  it("reports no version before the first write", async () => {
    const { repo } = stubContainer();
    expect((await repo.read()).version).toBeNull();
  });

  it("bumps the version with IfMatch in the same batch as the change", async () => {
    const { repo, batch } = stubContainer();
    await repo.write({ create: [{ id: "t1" }], remove: ["t0"] }, '"v7"');
    const [operations, partitionKey] = batch.mock.calls[0];
    expect(partitionKey).toBe("me");
    expect(operations[0]).toMatchObject({
      operationType: "Replace",
      id: VERSION_ID,
      ifMatch: '"v7"',
    });
    expect(operations.slice(1)).toEqual([
      { operationType: "Create", resourceBody: { id: "t1" } },
      { operationType: "Delete", id: "t0" },
    ]);
  });

  it("creates the version document on the first write", async () => {
    const { repo, batch } = stubContainer();
    await repo.write({ create: [{ id: "t1" }] }, null);
    expect(batch.mock.calls[0][0][0]).toMatchObject({
      operationType: "Create",
      resourceBody: { id: VERSION_ID, scope: "me", kind: "version" },
    });
  });

  it.each([
    [[{ statusCode: 412 }, { statusCode: 424 }], 409, "Something changed"],
    [[{ statusCode: 409 }, { statusCode: 424 }], 409, "Something changed"],
    [[{ statusCode: 424 }, { statusCode: 409 }], 409, "already recorded"],
    [[{ statusCode: 424 }, { statusCode: 404 }], 404, "no longer exists"],
  ])("maps failed batch %j to %i", async (batchResult, status, message) => {
    const { repo } = stubContainer({ batchResult });
    await expect(repo.write({ create: [{ id: "t1" }] }, '"v7"')).rejects.toMatchObject({
      status,
      message: expect.stringContaining(message),
    });
  });

  it("fails loudly on any other batch failure", async () => {
    const { repo } = stubContainer({ batchResult: [{ statusCode: 424 }, { statusCode: 500 }] });
    await expect(repo.write({ create: [{ id: "t1" }] }, '"v7"')).rejects.toThrow(/status 500/);
  });

  describe("when the batch call throws and loses its status", () => {
    const thrown = new Error("Batch request error: undefined");

    it("answers Refresh when the version moved on", async () => {
      const { repo } = stubContainer({
        version: '"v7"',
        batchThrows: thrown,
        etagsAfter: { [VERSION_ID]: '"v8"' },
      });
      await expect(repo.write({ create: [{ id: "t1" }] }, '"v7"')).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining("Something changed"),
      });
    });

    it("answers already recorded when a created id now exists", async () => {
      const { repo } = stubContainer({
        version: '"v7"',
        batchThrows: thrown,
        etagsAfter: { [VERSION_ID]: '"v7"', t1: '"t"' },
      });
      await expect(repo.write({ create: [{ id: "t1" }] }, '"v7"')).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining("already recorded"),
      });
    });

    it("rethrows the original error when nothing explains it", async () => {
      const { repo } = stubContainer({
        version: '"v7"',
        batchThrows: thrown,
        etagsAfter: { [VERSION_ID]: '"v7"' },
      });
      await expect(repo.write({ create: [{ id: "t1" }] }, '"v7"')).rejects.toBe(thrown);
    });
  });
});
