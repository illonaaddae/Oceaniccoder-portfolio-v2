import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAllBlogViewStats, getPostViewStats, recordBlogView } from "./blogViews";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type FetchArgs = Parameters<typeof fetch>;
let fetchMock: ReturnType<typeof vi.fn<FetchArgs, Promise<Response>>>;

beforeEach(() => {
  fetchMock = vi.fn<FetchArgs, Promise<Response>>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("blog view stats", () => {
  it("reads one post's stats from the counters API", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { readers: 2, reads: 4 }));

    expect(await getPostViewStats("p 1")).toEqual({ readers: 2, reads: 4 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/counters/blog-views?postId=p%201");
  });

  it("returns zeroes rather than throwing when the read fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: "down" }));

    expect(await getPostViewStats("p1")).toEqual({ readers: 0, reads: 0 });
  });

  it("reads every post's stats in one request", async () => {
    const stats = { p1: { readers: 1, reads: 2 }, p2: { readers: 2, reads: 2 } };
    fetchMock.mockResolvedValue(jsonResponse(200, stats));

    expect(await getAllBlogViewStats()).toEqual(stats);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/counters/blog-views");
  });

  it("returns no stats rather than throwing when the list fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    expect(await getAllBlogViewStats()).toEqual({});
  });
});

describe("recordBlogView", () => {
  it("posts the view and returns the stats the server sends back", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { readers: 1, reads: 3 }));

    const stats = await recordBlogView("p1", "v1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/counters/blog-view");
    expect(JSON.parse(init?.body as string)).toEqual({ postId: "p1", visitorId: "v1" });
    expect(stats).toEqual({ readers: 1, reads: 3 });
  });

  it("swallows write failures so the article still renders", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    expect(await recordBlogView("p1", "v1")).toBeNull();
  });
});
