import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { getStorageStats } from "./storage";

type FetchFn = (...args: Parameters<typeof fetch>) => Promise<Response>;
let fetchMock: Mock<FetchFn>;

const EMPTY = {
  totalFiles: 0,
  totalSizeBytes: 0,
  totalSizeMB: 0,
  usedPercentage: 0,
  maxStorageMB: 2048,
};

beforeEach(() => {
  fetchMock = vi.fn<FetchFn>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getStorageStats", () => {
  it("computes usage from the media listing", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ totalFiles: 3, totalBytes: 512 * 1024 * 1024 }), {
        status: 200,
      }),
    );

    expect(await getStorageStats()).toEqual({
      totalFiles: 3,
      totalSizeBytes: 512 * 1024 * 1024,
      totalSizeMB: 512,
      usedPercentage: 25,
      maxStorageMB: 2048,
    });
  });

  it("returns empty stats when a 200 answer is not the media listing", async () => {
    fetchMock.mockResolvedValue(new Response("<!doctype html><html></html>", { status: 200 }));

    expect(await getStorageStats()).toEqual(EMPTY);
  });

  it("returns empty stats when the request is refused", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "no" }), { status: 401 }));

    expect(await getStorageStats()).toEqual(EMPTY);
  });
});
