import { describe, it, expect, vi, afterEach } from "vitest";
import { submitRow } from "./dataApi";

describe("dataApi requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes an abort signal through submitRow to fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    await submitRow("messages", { name: "Ada" }, "tok", {}, { signal });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/submit/messages"),
      expect.objectContaining({ signal }),
    );
  });
});
