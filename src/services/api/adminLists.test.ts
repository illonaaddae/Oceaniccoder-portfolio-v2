import { describe, it, expect, vi, afterEach } from "vitest";
import { databases, COLLECTIONS } from "./client";
import { getMessages } from "./messages";
import { getBookings } from "./bookings";
import { getInquiries } from "./inquiries";
import { getExpenses } from "./expenses";

const rows = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ $id: `r${from + i}` }));

// Each admin list used to make one capped request (25, 100 or 200 rows), so
// older rows silently vanished from the tabs and from Analytics.
describe.each([
  ["getMessages", getMessages, COLLECTIONS.MESSAGES],
  ["getBookings", getBookings, COLLECTIONS.BOOKINGS],
  ["getInquiries", getInquiries, COLLECTIONS.PROJECT_INQUIRIES],
  ["getExpenses", getExpenses, COLLECTIONS.EXPENSES],
] as const)("%s", (_name, read, collection) => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pages past the old cap and returns every row", async () => {
    const list = vi
      .spyOn(databases, "listDocuments")
      .mockResolvedValueOnce({ total: 230, documents: rows(1, 100) } as never)
      .mockResolvedValueOnce({ total: 230, documents: rows(101, 100) } as never)
      .mockResolvedValueOnce({ total: 230, documents: rows(201, 30) } as never);

    const result = await read();

    expect(result).toHaveLength(230);
    expect(list).toHaveBeenCalledTimes(3);
    expect(list.mock.calls.every((c) => c[1] === collection)).toBe(true);
    expect(JSON.stringify(list.mock.calls[1][2])).toContain("r100");
  });
});

describe("getExpenses ordering and failure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the latest expense date first, whatever order the rows were created in", async () => {
    vi.spyOn(databases, "listDocuments").mockResolvedValueOnce({
      total: 3,
      documents: [
        { $id: "a", date: "2026-03-01" },
        { $id: "b", date: "2026-09-15" },
        { $id: "c", date: "2026-06-30" },
      ],
    } as never);
    expect((await getExpenses()).map((e) => e.$id)).toEqual(["b", "c", "a"]);
  });

  it("passes a read error on instead of returning an empty list", async () => {
    vi.spyOn(databases, "listDocuments").mockImplementation(async () => {
      throw new Error("Collection not found");
    });
    await expect(getExpenses()).rejects.toThrow("Collection not found");
  });

  it("returns an empty list for an empty table", async () => {
    vi.spyOn(databases, "listDocuments").mockResolvedValueOnce({
      total: 0,
      documents: [],
    } as never);
    expect(await getExpenses()).toEqual([]);
  });
});
