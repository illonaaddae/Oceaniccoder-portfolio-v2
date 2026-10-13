// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRequire } from "module";

// Same node-appwrite instance as index.js (vi.mock does not reach CommonJS require).
const require = createRequire(import.meta.url);
const sdk = require("node-appwrite");
const handler = require("./index.js");
const { createHandler } = handler;

const comment = (overrides = {}) => ({
  $id: "c1",
  $createdAt: "2026-10-01T10:00:00.000Z",
  $updatedAt: "2026-10-01T10:00:00.000Z",
  $permissions: [],
  $databaseId: "db",
  $collectionId: "comments",
  postId: "post1",
  userId: "u1",
  authorName: "Ada",
  authorEmail: "ada@example.com",
  content: "Nice post",
  isApproved: true,
  ...overrides,
});

function setup(documents) {
  const listDocuments = vi.fn().mockResolvedValue({ total: documents.length, documents });
  const run = createHandler({ databases: () => ({ listDocuments }) });
  const call = async (query) => {
    const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn() }) };
    await run(context, { method: "GET", query });
    return { res: context.res, body: JSON.parse(context.res.body), context };
  };
  return { listDocuments, call };
}

describe("GET /api/comments", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.APPWRITE_API_KEY;
  });

  it("returns only the public fields of each comment, never the email", async () => {
    const { call } = setup([comment(), comment({ $id: "c2", parentId: "c1" })]);

    const { res, body } = await call({ postId: "post1" });

    expect(res.status).toBe(200);
    expect(body).toEqual({
      total: 2,
      documents: [
        {
          $id: "c1",
          $createdAt: "2026-10-01T10:00:00.000Z",
          postId: "post1",
          authorName: "Ada",
          content: "Nice post",
          isApproved: true,
        },
        {
          $id: "c2",
          $createdAt: "2026-10-01T10:00:00.000Z",
          postId: "post1",
          authorName: "Ada",
          content: "Nice post",
          parentId: "c1",
          isApproved: true,
        },
      ],
    });
    expect(res.body).not.toContain("ada@example.com");
    expect(res.body).not.toContain("authorEmail");
  });

  it("asks Appwrite for this post's approved comments, newest first, capped", async () => {
    const { listDocuments, call } = setup([]);

    await call({ postId: "post1" });

    const [, collection, queries] = listDocuments.mock.calls[0];
    expect(collection).toBe("comments");
    expect(queries).toEqual([
      sdk.Query.equal("postId", ["post1"]),
      sdk.Query.equal("isApproved", [true]),
      sdk.Query.orderDesc("$createdAt"),
      sdk.Query.limit(100),
    ]);
  });

  it("drops unapproved or other posts' comments even if the query lets them through", async () => {
    const { call } = setup([
      comment({ $id: "ok" }),
      comment({ $id: "hidden", isApproved: false }),
      comment({ $id: "unset", isApproved: undefined }),
      comment({ $id: "other", postId: "post2" }),
    ]);

    const { body } = await call({ postId: "post1" });

    expect(body.documents.map((c) => c.$id)).toEqual(["ok"]);
    expect(body.total).toBe(1);
  });

  it("is not cached, so a new or hidden comment shows on the next load", async () => {
    const { res } = await setup([]).call({ postId: "post1" });
    expect(res.headers["Cache-Control"]).toBe("no-store");
    expect(res.headers["Content-Type"]).toBe("application/json");
  });

  it.each([
    [{}],
    [{ postId: "" }],
    [{ postId: "../secrets" }],
    [{ postId: "a b" }],
    [{ postId: "x".repeat(65) }],
    [{ postId: ["post1", "post2"] }],
  ])("rejects %j with 400 without reading Appwrite", async (query) => {
    const { listDocuments, call } = setup([comment()]);

    const { res, body } = await call(query);

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Invalid postId" });
    expect(listDocuments).not.toHaveBeenCalled();
  });

  it("answers 500 with a generic message and logs when Appwrite fails", async () => {
    const run = createHandler({
      databases: () => ({ listDocuments: vi.fn().mockRejectedValue(new Error("boom")) }),
    });
    const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn() }) };

    await run(context, { method: "GET", query: { postId: "post1" } });

    expect(context.res.status).toBe(500);
    expect(JSON.parse(context.res.body).error).toMatch(/Something went wrong/);
    expect(context.log.error).toHaveBeenCalledWith(expect.stringContaining("boom"));
  });

  it("reads with the server API key through the shared Appwrite client", async () => {
    process.env.APPWRITE_API_KEY = "test-key";
    const list = vi
      .spyOn(sdk.Databases.prototype, "listDocuments")
      .mockResolvedValue({ total: 1, documents: [comment()] });
    const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn() }) };

    await handler(context, { method: "GET", query: { postId: "post1" } });

    expect(list).toHaveBeenCalledTimes(1);
    expect(context.res.status).toBe(200);
    expect(JSON.parse(context.res.body).documents[0]).not.toHaveProperty("authorEmail");
  });
});
