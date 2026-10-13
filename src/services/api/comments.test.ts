import { describe, it, expect, vi, afterEach } from "vitest";

const publicComment = {
  $id: "c1",
  postId: "post 1",
  authorName: "Ada",
  content: "Nice post",
  isApproved: true,
};

function mockFetch(body: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
}

/** comments.ts reads VITE_DATA_BACKEND once, at import. */
async function loadComments(backend?: "cosmos") {
  vi.resetModules();
  if (backend) vi.stubEnv("VITE_DATA_BACKEND", backend);
  const comments = await import("./comments");
  const { databases } = await import("./client");
  return { ...comments, databases };
}

describe("comments service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("Appwrite build", () => {
    it("reads a post's comments through /api/comments, not the collection", async () => {
      const { getCommentsByPostId, databases } = await loadComments();
      const list = vi.spyOn(databases, "listDocuments");
      const fetchMock = mockFetch({ total: 1, documents: [publicComment] });
      vi.stubGlobal("fetch", fetchMock);

      const result = await getCommentsByPostId("post 1");

      expect(fetchMock).toHaveBeenCalledWith("/api/comments?postId=post%201");
      expect(list).not.toHaveBeenCalled();
      expect(result).toEqual([publicComment]);
    });

    it("rejects with the server's message when the read fails", async () => {
      const { getCommentsByPostId } = await loadComments();
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ error: "Invalid postId" }), { status: 400 }),
          ),
      );

      await expect(getCommentsByPostId("post1")).rejects.toThrow("Invalid postId");
    });

    it("still creates a visitor's comment in the browser", async () => {
      const { createComment, databases } = await loadComments();
      const create = vi
        .spyOn(databases, "createDocument")
        .mockResolvedValue({ ...publicComment, $id: "new" } as never);
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const created = await createComment({
        postId: "post1",
        authorName: "Ada",
        content: "Hi",
        isApproved: true,
      });

      expect(create).toHaveBeenCalledTimes(1);
      expect(create.mock.calls[0][1]).toBe("comments");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(created.$id).toBe("new");
    });
  });

  describe("Cosmos build", () => {
    it("keeps reading through /api/data", async () => {
      const { getCommentsByPostId, databases } = await loadComments("cosmos");
      const list = vi.spyOn(databases, "listDocuments");
      const fetchMock = mockFetch({ total: 1, documents: [publicComment] });
      vi.stubGlobal("fetch", fetchMock);

      const result = await getCommentsByPostId("post1");

      const url = new URL(fetchMock.mock.calls[0][0] as string, "https://example.test");
      expect(url.pathname).toBe("/api/data/comments");
      expect(JSON.parse(url.searchParams.get("where") ?? "")).toEqual({
        postId: "post1",
        isApproved: true,
      });
      expect(url.searchParams.get("orderBy")).toBe("$createdAt");
      expect(url.searchParams.get("dir")).toBe("desc");
      expect(list).not.toHaveBeenCalled();
      expect(result).toEqual([publicComment]);
    });
  });
});
