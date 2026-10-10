import { describe, it, expect } from "vitest";
import { quotePaymentsAsRevenue } from "./quoteRevenue";

describe("quotePaymentsAsRevenue", () => {
  it("turns successful quote payments into paid revenue rows", () => {
    const rows = quotePaymentsAsRevenue([
      {
        kind: "quote",
        status: "success",
        amount: 60,
        currency: "GHS",
        paidAt: "2026-10-02T00:00:00Z",
        invoiceNumber: "Q-1-INV-1",
      },
      { kind: "quote", status: "pending", amount: 40, currency: "GHS", invoiceNumber: "Q-1-INV-2" },
      { status: "success", amount: 99, currency: "GHS", invoiceNumber: "INV-1" },
    ] as never);
    expect(rows).toEqual([
      expect.objectContaining({
        status: "paid",
        total: 60,
        currency: "GHS",
        $createdAt: "2026-10-02T00:00:00Z",
      }),
    ]);
  });

  it("keeps USD, excludes failed/refunded, and falls back to $createdAt", () => {
    const rows = quotePaymentsAsRevenue([
      {
        kind: "quote",
        status: "success",
        amount: 10,
        currency: "USD",
        $createdAt: "2026-09-01T00:00:00Z",
      },
      { kind: "quote", status: "failed", amount: 5, currency: "USD" },
      { kind: "quote", status: "refunded", amount: 7, currency: "USD" },
    ] as never);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      currency: "USD",
      total: 10,
      $createdAt: "2026-09-01T00:00:00Z",
    });
  });
});
