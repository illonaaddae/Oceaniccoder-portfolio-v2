import { describe, it, expect, vi, afterEach } from "vitest";
import { databases } from "./client";
import { getAllBlogViewStats, getPostViewStats, recordBlogView } from "./blogViews";

const doc = (id: string, postId: string, visitorId: string, reads?: number) => ({
  $id: id,
  postId,
  visitorId,
  reads,
});

function mockList(pages: unknown[][]) {
  let call = 0;
  return vi.spyOn(databases, "listDocuments").mockImplementation((() => {
    const documents = pages[Math.min(call, pages.length - 1)];
    call += 1;
    return Promise.resolve({ documents, total: documents.length });
  }) as never);
}

describe("blog view stats", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("counts one reader per visitor and sums their reads", async () => {
    mockList([[doc("1", "p1", "v1", 3), doc("2", "p1", "v2", 1), doc("3", "p2", "v1", 5)]]);

    expect(await getPostViewStats("p1")).toEqual({ readers: 2, reads: 4 });
  });

  it("treats a missing reads field as a single read", async () => {
    mockList([[doc("1", "p1", "v1"), doc("2", "p1", "v2", 0)]]);

    expect(await getPostViewStats("p1")).toEqual({ readers: 2, reads: 2 });
  });

  it("returns zeroes for a post nobody has read", async () => {
    mockList([[]]);

    expect(await getPostViewStats("p1")).toEqual({ readers: 0, reads: 0 });
  });

  it("returns zeroes rather than throwing when the query fails", async () => {
    vi.spyOn(databases, "listDocuments").mockRejectedValue(new Error("offline") as never);

    expect(await getPostViewStats("p1")).toEqual({ readers: 0, reads: 0 });
  });

  it("keys stats by post across every post", async () => {
    mockList([[doc("1", "p1", "v1", 2), doc("2", "p2", "v1", 1), doc("3", "p2", "v2", 1)]]);

    expect(await getAllBlogViewStats()).toEqual({
      p1: { readers: 1, reads: 2 },
      p2: { readers: 2, reads: 2 },
    });
  });

  it("pages past Appwrite's 100-document limit", async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => doc(`d${i}`, "p1", `v${i}`, 1));
    mockList([firstPage, [doc("d100", "p1", "v100", 1)], []]);

    expect(await getPostViewStats("p1")).toEqual({ readers: 101, reads: 101 });
  });
});

describe("recordBlogView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a row the first time a visitor opens a post", async () => {
    const create = vi.spyOn(databases, "createDocument").mockResolvedValue({} as never);
    let call = 0;
    vi.spyOn(databases, "listDocuments").mockImplementation((() => {
      call += 1;
      // First call: the dedupe lookup. Second: the stats refetch.
      return Promise.resolve(
        call === 1
          ? { documents: [], total: 0 }
          : { documents: [doc("1", "p1", "v1", 1)], total: 1 },
      );
    }) as never);

    const stats = await recordBlogView("p1", "v1");

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][3]).toMatchObject({ postId: "p1", visitorId: "v1", reads: 1 });
    expect(stats).toEqual({ readers: 1, reads: 1 });
  });

  it("increments the existing row on a repeat visit", async () => {
    const update = vi.spyOn(databases, "updateDocument").mockResolvedValue({} as never);
    const create = vi.spyOn(databases, "createDocument").mockResolvedValue({} as never);
    let call = 0;
    vi.spyOn(databases, "listDocuments").mockImplementation((() => {
      call += 1;
      return Promise.resolve(
        call === 1
          ? { documents: [doc("1", "p1", "v1", 2)], total: 1 }
          : { documents: [doc("1", "p1", "v1", 3)], total: 1 },
      );
    }) as never);

    const stats = await recordBlogView("p1", "v1");

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][3]).toMatchObject({ reads: 3 });
    expect(stats).toEqual({ readers: 1, reads: 3 });
  });

  it("swallows write failures so the article still renders", async () => {
    vi.spyOn(databases, "listDocuments").mockRejectedValue(new Error("offline") as never);

    expect(await recordBlogView("p1", "v1")).toBeNull();
  });
});
