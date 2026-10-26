import { describe, it, expect, vi, beforeEach } from "vitest";
import { COLLECTIONS } from "./collections";
import { getMessages } from "./messages";
import { getBookings } from "./bookings";
import { getInquiries } from "./inquiries";
import { getExpenses } from "./expenses";

const api = vi.hoisted(() => ({
  manageList: vi.fn(),
  readsAsAdmin: vi.fn(),
}));
vi.mock("./dataApi", () => api);

beforeEach(() => {
  vi.resetAllMocks();
  api.readsAsAdmin.mockReturnValue(true);
});

// Rows with contact details: only the signed-in dashboard reads them.
describe.each([
  ["getMessages", getMessages, COLLECTIONS.MESSAGES],
  ["getBookings", getBookings, COLLECTIONS.BOOKINGS],
  ["getInquiries", getInquiries, COLLECTIONS.PROJECT_INQUIRIES],
] as const)("%s", (_name, read, collection) => {
  it("lists every row newest first in the admin dashboard", async () => {
    api.manageList.mockResolvedValue({ total: 2, documents: [{ $id: "a" }, { $id: "b" }] });

    expect(await read()).toEqual([{ $id: "a" }, { $id: "b" }]);
    expect(api.manageList).toHaveBeenCalledWith(collection, {
      orderBy: "$createdAt",
      dir: "desc",
    });
  });

  it("reads nothing on the read-only /dashboard", async () => {
    api.readsAsAdmin.mockReturnValue(false);

    expect(await read()).toEqual([]);
    expect(api.manageList).not.toHaveBeenCalled();
  });
});

describe("getExpenses", () => {
  it("asks for the latest expense date first", async () => {
    api.manageList.mockResolvedValue({ total: 1, documents: [{ $id: "a", date: "2026-09-15" }] });

    expect(await getExpenses()).toEqual([{ $id: "a", date: "2026-09-15" }]);
    expect(api.manageList).toHaveBeenCalledWith(COLLECTIONS.EXPENSES, {
      orderBy: "date",
      dir: "desc",
    });
  });

  it("passes a read error on instead of returning an empty list", async () => {
    api.manageList.mockImplementation(async () => {
      throw new Error("Collection not found");
    });
    await expect(getExpenses()).rejects.toThrow("Collection not found");
  });
});
