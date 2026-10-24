import { describe, it, expect, vi, afterEach } from "vitest";
import { createComment, getAllComments, getCommentsByPostId } from "./comments";
import { setAdminReads } from "./dataApi";

const publicComment = {
  $id: "c1",
  postId: "post 1",
  authorName: "Ada",
  content: "Nice post",
  isApproved: true,
};

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("comments service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAdminReads(false);
    window.history.replaceState({}, "", "/");
  });

  it("reads a post's approved comments through /api/data", async () => {
    const fetchMock = mockFetch({ total: 1, documents: [publicComment] });

    const result = await getCommentsByPostId("post1");

    const url = new URL(fetchMock.mock.calls[0][0] as string, "https://example.test");
    expect(url.pathname).toBe("/api/data/comments");
    expect(JSON.parse(url.searchParams.get("where") ?? "")).toEqual({
      postId: "post1",
      isApproved: true,
    });
    expect(url.searchParams.get("orderBy")).toBe("$createdAt");
    expect(url.searchParams.get("dir")).toBe("desc");
    expect(result).toEqual([publicComment]);
  });

  it("rejects with the server's message when the read fails", async () => {
    mockFetch({ error: "Invalid postId" }, 400);

    await expect(getCommentsByPostId("post1")).rejects.toThrow("Invalid postId");
  });

  it("reads no comments (they carry emails) on the read-only /dashboard", async () => {
    const fetchMock = mockFetch({ total: 1, documents: [publicComment] });

    expect(await getAllComments()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads every comment through /api/manage in the admin dashboard", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    setAdminReads(true);
    const fetchMock = mockFetch({ total: 1, documents: [publicComment] });

    expect(await getAllComments()).toEqual([publicComment]);
    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/api\/manage\/comments\?/);
  });

  it("sends a visitor's comment through /api/submit with the spam-check token", async () => {
    const fetchMock = mockFetch({ ...publicComment, $id: "new" });

    const created = await createComment(
      { postId: "post1", authorName: "Ada", content: "Hi", isApproved: true },
      "token-1",
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/submit/comments");
    expect(JSON.parse(init.body)).toMatchObject({ postId: "post1", turnstileToken: "token-1" });
    expect(created.$id).toBe("new");
  });
});
