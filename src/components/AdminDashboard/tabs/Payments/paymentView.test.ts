import { describe, it, expect } from "vitest";
import {
  computeKpis,
  inFilter,
  matchesSearch,
  momoNetworkLabel,
  toRows,
  totalsByCurrency,
} from "./paymentView";
import type { Payment } from "@/services/api/payments";

const NOW = new Date("2026-10-12T12:00:00.000Z");

let n = 0;
const pay = (over: Partial<Payment> = {}) =>
  ({
    $id: `p${++n}`,
    $createdAt: "2026-10-12T11:50:00.000Z",
    invoiceNumber: "INV-1",
    clientName: "Ama Owusu",
    clientEmail: "ama@example.com",
    amount: 100,
    currency: "GHS",
    method: "card",
    status: "success",
    ...over,
  }) as Payment;

describe("totalsByCurrency", () => {
  it("never adds different currencies together", () => {
    expect(
      totalsByCurrency([pay(), pay({ amount: 50 }), pay({ currency: "USD", amount: 20 })]),
    ).toEqual([
      { currency: "GHS", amount: 150 },
      { currency: "USD", amount: 20 },
    ]);
  });
});

describe("computeKpis", () => {
  it("splits this month from all time, counts awaiting and rates success", () => {
    const rows = toRows(
      [
        pay({ paidAt: "2026-10-02T00:00:00.000Z" }),
        pay({ paidAt: "2026-09-02T00:00:00.000Z", currency: "USD", amount: 40 }),
        pay({ status: "pending", amount: 70 }),
        pay({ status: "pending", $createdAt: "2026-10-12T10:00:00.000Z" }), // abandoned (old)
        pay({ status: "failed" }),
        pay({ status: "failed", archivedAt: "2026-10-11T00:00:00.000Z" }), // archived: ignored
        pay({ status: "duplicate" }), // not rated
      ],
      NOW.getTime(),
    );
    const k = computeKpis(rows, NOW);
    expect(k.thisMonth).toEqual([{ currency: "GHS", amount: 100 }]);
    expect(k.allTime).toEqual([
      { currency: "GHS", amount: 100 },
      { currency: "USD", amount: 40 },
    ]);
    expect(k.awaitingCount).toBe(1);
    expect(k.awaiting).toEqual([{ currency: "GHS", amount: 70 }]);
    // 2 paid / (2 paid + 1 failed + 1 abandoned)
    expect(k.successRate).toBe(0.5);
  });

  it("has no success rate when nothing has been attempted", () => {
    expect(computeKpis([], NOW).successRate).toBeNull();
  });
});

describe("inFilter", () => {
  const [paid, abandoned, archived] = toRows(
    [
      pay(),
      pay({ status: "abandoned" }),
      pay({ status: "failed", archivedAt: "2026-10-11T00:00:00.000Z" }),
    ],
    NOW.getTime(),
  );
  it("keeps abandoned and archived rows out of All", () => {
    expect(inFilter(paid, "all")).toBe(true);
    expect(inFilter(abandoned, "all")).toBe(false);
    expect(inFilter(archived, "all")).toBe(false);
  });
  it("shows archived rows only under Archived", () => {
    expect(inFilter(archived, "failed")).toBe(false);
    expect(inFilter(archived, "archived")).toBe(true);
    expect(inFilter(abandoned, "abandoned")).toBe(true);
  });
});

describe("toRows", () => {
  it("orders rows newest first whatever order they arrive in", () => {
    const rows = toRows(
      [
        pay({ $id: "old", $createdAt: "2026-10-01T00:00:00.000Z" }),
        pay({ $id: "new", $createdAt: "2026-10-12T00:00:00.000Z" }),
        pay({ $id: "mid", $createdAt: "2026-10-05T00:00:00.000Z" }),
      ],
      NOW.getTime(),
    );
    expect(rows.map((r) => r.payment.$id)).toEqual(["new", "mid", "old"]);
  });
});

describe("matchesSearch and momoNetworkLabel", () => {
  it("matches reference, invoice and quote numbers case-insensitively", () => {
    const p = pay({ paystackReference: "Q-2026-0001-1-ABC", quoteNumber: "Q-2026-0001" });
    expect(matchesSearch(p, "abc")).toBe(true);
    expect(matchesSearch(p, "inv-1")).toBe(true);
    expect(matchesSearch(p, "AMA@")).toBe(true);
    expect(matchesSearch(p, "kofi")).toBe(false);
    expect(matchesSearch(p, "  ")).toBe(true);
  });
  it("reads the network from a Mobile Money note only", () => {
    expect(momoNetworkLabel({ method: "momo", note: "network:mtn" })).toBe("MTN MoMo");
    expect(momoNetworkLabel({ method: "momo", note: "network:nope" })).toBeNull();
    expect(momoNetworkLabel({ method: "card", note: "network:mtn" })).toBeNull();
    expect(momoNetworkLabel({ method: "momo" })).toBeNull();
  });
});
