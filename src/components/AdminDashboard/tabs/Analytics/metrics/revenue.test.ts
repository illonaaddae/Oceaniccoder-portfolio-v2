import { describe, it, expect } from "vitest";
import { buildLedger, paymentAmount } from "./revenue";
import type { Payment } from "@/services/api/payments";
import type { Invoice } from "@/types";

const pay = (over: Partial<Payment>): Payment => ({
  $id: "p1",
  $createdAt: "2026-10-05T12:00:00Z",
  invoiceNumber: "INV-1",
  clientName: "Ama",
  clientEmail: "ama@example.com",
  amount: 100,
  currency: "GHS",
  method: "card",
  status: "success",
  ...over,
});

const invoice = (over: Partial<Invoice>): Invoice => ({
  $id: "i1",
  invoiceNumber: "INV-1",
  clientName: "Ama",
  clientEmail: "ama@example.com",
  items: "[]",
  currency: "GHS",
  subtotal: 100,
  tax: 0,
  total: 100,
  status: "paid",
  $createdAt: "2026-01-02T00:00:00Z",
  $updatedAt: "2026-03-04T00:00:00Z",
  ...over,
});

describe("buildLedger", () => {
  it("dates a payment by paidAt, not by when its invoice was created", () => {
    const [entry] = buildLedger(
      [pay({ paidAt: "2026-10-07T09:00:00Z" })],
      [invoice({ $createdAt: "2026-01-02T00:00:00Z" })],
    );
    expect(entry).toMatchObject({
      date: "2026-10-07T09:00:00Z",
      amount: 100,
      kind: "invoice",
      estimated: false,
    });
  });

  it("falls back to the row's $createdAt when paidAt is missing", () => {
    expect(buildLedger([pay({ paidAt: undefined })], [])[0].date).toBe("2026-10-05T12:00:00Z");
  });

  it("counts successful quote and invoice payments and nothing else", () => {
    const ledger = buildLedger(
      [
        pay({ $id: "a", kind: "quote", invoiceNumber: "Q-2026-0001-1" }),
        pay({ $id: "b", invoiceNumber: "INV-2" }),
        pay({ $id: "c", status: "failed" }),
        pay({ $id: "d", status: "pending" }),
        pay({ $id: "e", status: "abandoned", archivedAt: "2026-10-06T00:00:00Z" }),
        pay({ $id: "f", status: "duplicate" }),
        pay({ $id: "g", status: "refunded" }),
      ],
      [],
    );
    expect(ledger.map((e) => [e.id, e.kind])).toEqual([
      ["a", "quote"],
      ["b", "invoice"],
    ]);
  });

  it("treats a row with no status as successful, as the Payments tab does", () => {
    expect(buildLedger([pay({ status: undefined })], [])).toHaveLength(1);
  });

  it("uses amountMinor when it is an integer and amount otherwise", () => {
    const ledger = buildLedger(
      [
        pay({ $id: "a", amount: 33.33, amountMinor: 3333 }),
        pay({ $id: "b", amount: 12.5 }),
        pay({ $id: "c", amount: 7, amountMinor: Number.NaN }),
      ],
      [],
    );
    expect(ledger.map((e) => e.amount)).toEqual([33.33, 12.5, 7]);
  });

  it("keeps each currency as it was paid", () => {
    const ledger = buildLedger([pay({ currency: "USD", amount: 10 })], []);
    expect(ledger[0]).toMatchObject({ currency: "USD", amount: 10 });
  });

  it("adds a paid invoice with no payment row, dated by its last update and flagged", () => {
    const ledger = buildLedger([], [invoice({})]);
    expect(ledger).toEqual([
      expect.objectContaining({
        id: "i1",
        kind: "invoice",
        amount: 100,
        date: "2026-03-04T00:00:00Z",
        estimated: true,
      }),
    ]);
  });

  it("does not count a paid invoice twice when its payment row exists", () => {
    const ledger = buildLedger([pay({ invoiceNumber: "INV-1" })], [invoice({})]);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].estimated).toBe(false);
  });

  it("still estimates an invoice whose only payment row failed", () => {
    const ledger = buildLedger([pay({ status: "failed" })], [invoice({})]);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].estimated).toBe(true);
  });

  it("ignores unpaid invoices", () => {
    expect(buildLedger([], [invoice({ status: "sent" }), invoice({ status: "draft" })])).toEqual(
      [],
    );
  });
});

describe("paymentAmount", () => {
  it("reads major units", () => {
    expect(paymentAmount({ amount: 5, amountMinor: 501 })).toBe(5.01);
    expect(paymentAmount({ amount: Number.NaN })).toBe(0);
  });
});
