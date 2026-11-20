// @vitest-environment node
import { describe, it, expect } from "vitest";

const { createFakeCosmos } = await import("./fakeCosmos.js");

// The fake stands in for @azure/cosmos in the quote repo tests, so its own
// behaviour is pinned here.
describe("fake Cosmos container", () => {
  it("reads a missing item as undefined with 404, like the SDK", async () => {
    const c = createFakeCosmos().container("quotes");
    expect(await c.item("nope", "nope").read()).toEqual({ resource: undefined, statusCode: 404 });
  });

  it("adds system fields and rejects a duplicate id with 409", async () => {
    const c = createFakeCosmos().container("quotes");
    const { resource } = await c.items.create({ id: "a", n: 1 });
    expect(resource).toMatchObject({
      id: "a",
      n: 1,
      _etag: expect.any(String),
      _ts: expect.any(Number),
    });
    await expect(c.items.create({ id: "a" })).rejects.toMatchObject({ code: 409 });
  });

  it("checks IfMatch etags on replace and 404s a missing item", async () => {
    const c = createFakeCosmos().container("quotes");
    const { resource } = await c.items.create({ id: "a", n: 1 });
    const ifMatch = { accessCondition: { type: "IfMatch", condition: resource._etag } };
    const { resource: next } = await c.item("a", "a").replace({ id: "a", n: 2 }, ifMatch);
    expect(next.n).toBe(2);
    await expect(c.item("a", "a").replace({ id: "a", n: 3 }, ifMatch)).rejects.toMatchObject({
      code: 412,
    });
    await expect(c.item("b", "b").replace({ id: "b" })).rejects.toMatchObject({ code: 404 });
  });

  it("finds an item only under its partition key", async () => {
    const c = createFakeCosmos().container("quotes");
    await c.items.create({ id: "a" });
    expect((await c.item("a", "other").read()).resource).toBeUndefined();
  });

  it("evaluates the supported SQL and rejects literals and unknown clauses", async () => {
    const c = createFakeCosmos().container("quotes");
    await c.items.create({ id: "a", status: "accepted", n: "Q-2026-0002" });
    await c.items.create({ id: "b", status: "accepted", sentAt: null, n: "Q-2026-0010" });
    await c.items.create({ id: "c", status: "accepted", sentAt: "2026-10-01", n: "Q-2025-0099" });
    const run = async (query, parameters = []) =>
      (await c.items.query({ query, parameters }).fetchAll()).resources;

    const open = await run(
      "SELECT * FROM c WHERE c.status = @s AND (NOT IS_DEFINED(c.sentAt) OR IS_NULL(c.sentAt))",
      [{ name: "@s", value: "accepted" }],
    );
    expect(open.map((d) => d.id).sort()).toEqual(["a", "b"]);
    expect(
      await run("SELECT TOP 1 c.n FROM c WHERE STARTSWITH(c.n, @p) ORDER BY c.n DESC", [
        { name: "@p", value: "Q-2026-" },
      ]),
    ).toEqual([{ n: "Q-2026-0010" }]);
    expect(
      await run("SELECT * FROM c WHERE c.sentAt < @t", [{ name: "@t", value: "2026-10-02" }]),
    ).toEqual([expect.objectContaining({ id: "c" })]);

    await expect(run("SELECT * FROM c WHERE c.status = 'accepted'")).rejects.toThrow(/literal/);
    await expect(run("SELECT * FROM c WHERE c.status != @s")).rejects.toThrow(/unsupported/);
    await expect(run("SELECT * FROM c WHERE c.status = @s")).rejects.toThrow(/no value/);
  });

  it("keeps the same id apart in different partitions", async () => {
    const c = createFakeCosmos({ views: "/postId" }).container("views");
    await c.items.create({ id: "total", postId: "p1", reads: 1 });
    await c.items.create({ id: "total", postId: "p2", reads: 2 });
    await expect(c.items.create({ id: "total", postId: "p1" })).rejects.toMatchObject({
      code: 409,
    });
    expect((await c.item("total", "p2").read()).resource.reads).toBe(2);
    await c.item("total", "p1").delete();
    expect((await c.item("total", "p1").read()).statusCode).toBe(404);
    expect((await c.item("total", "p2").read()).statusCode).toBe(200);
  });

  it("projects several fields, scopes a query to a partition and patches items", async () => {
    const c = createFakeCosmos({ views: "/postId" }).container("views");
    await c.items.create({ id: "a", postId: "p1", reads: 1, extra: "x" });
    await c.items.create({ id: "b", postId: "p2", reads: 2 });
    const spec = { query: "SELECT c.postId, c.reads FROM c", parameters: [] };

    expect((await c.items.query(spec).fetchAll()).resources).toHaveLength(2);
    expect((await c.items.query(spec, { partitionKey: "p1" }).fetchAll()).resources).toEqual([
      { postId: "p1", reads: 1 },
    ]);

    const { resource } = await c.item("a", "p1").patch([
      { op: "incr", path: "/reads", value: 2 },
      { op: "incr", path: "/readers", value: 1 },
      { op: "set", path: "/extra", value: "y" },
    ]);
    expect(resource).toEqual(expect.objectContaining({ reads: 3, readers: 1, extra: "y" }));
    await expect(c.item("a", "p2").patch([])).rejects.toMatchObject({ code: 404 });
  });
});
