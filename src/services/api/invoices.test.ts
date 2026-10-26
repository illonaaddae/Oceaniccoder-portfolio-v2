import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInvoice } from "./invoices";

const api = vi.hoisted(() => ({
  manageCreate: vi.fn(),
  manageList: vi.fn(),
  manageUpdate: vi.fn(),
}));
vi.mock("./dataApi", () => api);

const fields = {
  clientName: "Ama",
  clientEmail: "ama@example.com",
  items: "[]",
  currency: "GHS",
  subtotal: 500,
  tax: 0,
  total: 500,
  status: "sent" as const,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("createInvoice", () => {
  it("returns the row with the number the server assigned", async () => {
    api.manageCreate.mockResolvedValue({ $id: "inv1", invoiceNumber: "INV-2026-0008" });

    expect(await createInvoice(fields)).toMatchObject({ invoiceNumber: "INV-2026-0008" });
    expect(api.manageCreate).toHaveBeenCalledWith("invoices", fields);
  });

  it("refuses a saved row that came back without a number", async () => {
    api.manageCreate.mockResolvedValue({ $id: "inv1" });

    await expect(createInvoice(fields)).rejects.toThrow(/saved without a number/);
  });
});
