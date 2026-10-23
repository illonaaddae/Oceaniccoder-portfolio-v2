import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPayment, getPayments, getPaymentsForInvoice } from "./payments";

const api = vi.hoisted(() => ({
  manageCreate: vi.fn(),
  manageList: vi.fn(),
}));
vi.mock("./dataApi", () => api);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getPayments", () => {
  it("lists every payment row newest first", async () => {
    api.manageList.mockResolvedValue({ total: 1, documents: [{ $id: "p1" }] });

    expect(await getPayments()).toEqual([{ $id: "p1" }]);
    expect(api.manageList).toHaveBeenCalledWith("payments", {
      orderBy: "$createdAt",
      dir: "desc",
    });
  });
});

describe("getPaymentsForInvoice", () => {
  it("filters on the invoice number", async () => {
    api.manageList.mockResolvedValue({ total: 0, documents: [] });

    await getPaymentsForInvoice("INV-1");

    expect(api.manageList).toHaveBeenCalledWith("payments", {
      where: { invoiceNumber: "INV-1" },
      limit: 100,
    });
  });
});

describe("createPayment", () => {
  it("sends only the fields that are set", async () => {
    await createPayment({
      invoiceNumber: "INV-1",
      clientName: "Ada",
      clientEmail: "ada@example.com",
      amount: 100,
      currency: "GHS",
      method: "bank",
      status: "success",
    });

    expect(api.manageCreate).toHaveBeenCalledWith("payments", {
      invoiceNumber: "INV-1",
      clientName: "Ada",
      clientEmail: "ada@example.com",
      amount: 100,
      currency: "GHS",
      method: "bank",
      status: "success",
    });
  });
});
