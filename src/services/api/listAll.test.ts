import { describe, it, expect, vi, afterEach } from "vitest";
import { listAllDocuments } from "./listAll";
import { databases } from "./client";

const rows = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ $id: `r${from + i}` }));

describe("listAllDocuments", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stops at the cap even when more rows exist, and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const list = vi
      .spyOn(databases, "listDocuments")
      .mockResolvedValueOnce({ total: 9999, documents: rows(1, 100) } as never)
      .mockResolvedValueOnce({ total: 9999, documents: rows(101, 100) } as never)
      .mockResolvedValueOnce({ total: 9999, documents: rows(201, 50) } as never);
    const result = await listAllDocuments("invoices", 250);
    // 100 + 100 + 50: the last page asks only for what is left under the cap.
    expect(list).toHaveBeenCalledTimes(3);
    expect(list.mock.calls[2][2]).toContain('{"method":"limit","values":[50]}');
    expect(result).toHaveLength(250);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/stopped at 250 rows in "invoices"/);
  });

  it("does not warn when the table ends before the cap", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(databases, "listDocuments")
      .mockResolvedValueOnce({ total: 130, documents: rows(1, 100) } as never)
      .mockResolvedValueOnce({ total: 130, documents: rows(101, 30) } as never);
    expect(await listAllDocuments("invoices", 250)).toHaveLength(130);
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns an empty list for an empty collection", async () => {
    vi.spyOn(databases, "listDocuments").mockResolvedValueOnce({
      total: 0,
      documents: [],
    } as never);
    expect(await listAllDocuments("invoices")).toEqual([]);
  });
});
