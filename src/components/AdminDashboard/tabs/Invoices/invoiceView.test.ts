// @vitest-environment node
// Node environment and the forks pool (vite.config.ts) so that setting
// process.env.TZ below really changes the local time zone.
import { describe, it, expect, afterEach } from "vitest";
import type { Invoice } from "@/types";
import {
  computeInvoiceKpis,
  inInvoiceFilter,
  oneOffStatus,
  parseItems,
  toInvoiceRows,
  type QuoteInvoiceRow,
} from "./invoiceView";

const NOW = new Date("2026-10-12T12:00:00Z"); // 12 Oct 2026, noon in Accra

const inv = (over: Partial<Invoice> = {}) =>
  ({
    $id: "inv1",
    $createdAt: "2026-10-01T00:00:00Z",
    invoiceNumber: "INV-1",
    clientName: "Ama",
    clientEmail: "ama@example.com",
    items: "[]",
    currency: "GHS",
    subtotal: 100,
    tax: 0,
    total: 100,
    status: "sent",
    ...over,
  }) as Invoice;

const stage = (over: Partial<QuoteInvoiceRow> = {}): QuoteInvoiceRow => ({
  stageId: "deposit",
  invoiceNumber: "Q-1-INV-1",
  label: "Deposit",
  percent: 60,
  amountMinor: 6000,
  state: "due",
  issuedAt: "2026-10-05T00:00:00Z",
  dueBy: "2026-10-12T00:00:00Z",
  overdue: false,
  paidAt: null,
  quoteId: "q1",
  quoteNumber: "Q-1",
  title: "Store",
  clientName: "Kofi",
  clientEmail: "",
  currency: "USD",
  ...over,
});

describe("oneOffStatus", () => {
  it("is due through the whole due date and overdue from the next day", () => {
    expect(oneOffStatus(inv({ dueDate: "2026-10-12" }), NOW)).toBe("due");
    expect(oneOffStatus(inv({ dueDate: "2026-10-11" }), NOW)).toBe("overdue");
    expect(oneOffStatus(inv({ dueDate: undefined }), NOW)).toBe("due");
    expect(oneOffStatus(inv({ dueDate: "not a date" }), NOW)).toBe("due");
  });
  describe("in a browser west of UTC", () => {
    const original = process.env.TZ;
    afterEach(() => {
      process.env.TZ = original;
    });

    // 13 Oct 20:00 UTC is still 13 Oct in Accra and in Los Angeles (13:00).
    // Reading "2026-10-13" as UTC midnight and ending the day in local time
    // made it overdue at 07:00 UTC on its own due date.
    it("doesn't mark an invoice overdue on its due date", () => {
      process.env.TZ = "America/Los_Angeles";
      expect(new Date("2026-10-13T00:00:00Z").getDate()).toBe(12); // the zone took effect
      const now = new Date("2026-10-13T20:00:00Z");
      expect(oneOffStatus(inv({ dueDate: "2026-10-13" }), now)).toBe("due");
      expect(oneOffStatus(inv({ dueDate: "2026-10-12" }), now)).toBe("overdue");
      // A stored timestamp is read as an Accra day too.
      expect(oneOffStatus(inv({ dueDate: "2026-10-13T00:00:00.000Z" }), now)).toBe("due");
    });

    it("becomes overdue when the Accra day after the due date starts", () => {
      process.env.TZ = "America/Los_Angeles";
      expect(oneOffStatus(inv({ dueDate: "2026-10-13" }), new Date("2026-10-13T23:59:59Z"))).toBe(
        "due",
      );
      expect(oneOffStatus(inv({ dueDate: "2026-10-13" }), new Date("2026-10-14T00:00:00Z"))).toBe(
        "overdue",
      );
    });
  });

  it("keeps paid and draft whatever the due date", () => {
    expect(oneOffStatus(inv({ status: "paid", dueDate: "2020-01-01" }), NOW)).toBe("paid");
    expect(oneOffStatus(inv({ status: "draft", dueDate: "2020-01-01" }), NOW)).toBe("draft");
  });
});

describe("parseItems", () => {
  it("reads a JSON array and treats anything else as no items", () => {
    expect(parseItems('[{"description":"A","quantity":1,"unitPrice":2}]')).toHaveLength(1);
    expect(parseItems("not json")).toEqual([]);
    expect(parseItems('{"a":1}')).toEqual([]);
    expect(parseItems(undefined)).toEqual([]);
  });
});

describe("toInvoiceRows and computeInvoiceKpis", () => {
  it("merges both sources newest first and never archives a quote stage", () => {
    const rows = toInvoiceRows(
      [inv({ $createdAt: "2026-10-01T00:00:00Z" })],
      [stage({ issuedAt: "2026-10-05T00:00:00Z" })],
      NOW,
    );
    expect(rows.map((r) => r.number)).toEqual(["Q-1-INV-1", "INV-1"]);
    expect(rows[0]).toMatchObject({ kind: "quote", amount: 60, archived: false, status: "due" });
  });

  it("totals per currency over live, sent invoices", () => {
    const rows = toInvoiceRows(
      [
        inv(),
        inv({ $id: "i2", invoiceNumber: "INV-2", dueDate: "2026-10-01", total: 50 }),
        inv({ $id: "i3", invoiceNumber: "INV-3", status: "paid", total: 70 }),
        inv({ $id: "i4", invoiceNumber: "INV-4", status: "draft", total: 999 }),
        inv({ $id: "i5", invoiceNumber: "INV-5", archivedAt: "2026-10-02T00:00:00Z", total: 5 }),
      ],
      [stage({ overdue: true }), stage({ stageId: "b", state: "paid", paidAt: "2026-10-06" })],
      NOW,
    );
    const k = computeInvoiceKpis(rows);
    expect(k.invoiced).toEqual([
      { currency: "GHS", amount: 220 },
      { currency: "USD", amount: 120 },
    ]);
    expect(k.paid).toEqual([
      { currency: "GHS", amount: 70 },
      { currency: "USD", amount: 60 },
    ]);
    expect(k.outstandingCount).toBe(3);
    expect(k.overdueCount).toBe(2);
    expect(k.overdue).toEqual([
      { currency: "USD", amount: 60 },
      { currency: "GHS", amount: 50 },
    ]);
    const archived = rows.find((r) => r.number === "INV-5");
    expect(archived && inInvoiceFilter(archived, "all")).toBe(false);
    expect(archived && inInvoiceFilter(archived, "archived")).toBe(true);
  });
});
