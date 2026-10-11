// @vitest-environment node
import { describe, it, expect } from "vitest";
import * as Q from "./quoteMath";
import type { AdminQuote } from "@/types/quote";

// The server rules are CommonJS outside src/; load them dynamically so tsc
// doesn't try to type them. This test keeps the editor and the server in step.
const modelPath = "../../api/shared/quotes/model.js";
const server = (await import(/* @vite-ignore */ modelPath)) as {
  computeTotals: typeof Q.computeTotals;
  stageAmounts: typeof Q.stageAmounts;
  scheduleError: typeof Q.scheduleError;
  DEFAULT_SCHEDULE: typeof Q.DEFAULT_SCHEDULE;
  DEFAULT_TERMS: string;
};

const items = [
  { id: "a", description: "A", qty: 1.5, unitMinor: 333 },
  { id: "b", description: "B", qty: 3, unitMinor: 9999 },
];

describe("parity with api/shared/quotes/model.js", () => {
  it.each([0, 1, 10001, 123457, 99999999])("splits %i the same way", (total) => {
    expect(Q.stageAmounts(total, Q.DEFAULT_SCHEDULE)).toEqual(
      server.stageAmounts(total, server.DEFAULT_SCHEDULE),
    );
  });
  it("totals the same way", () => {
    expect(Q.computeTotals(items, 250)).toEqual(server.computeTotals(items, 250));
  });
  it.each([[[]], [[{ id: "a", label: "A", percent: 50 }]], [Q.DEFAULT_SCHEDULE]])(
    "validates %j the same way",
    (schedule) => {
      expect(Q.scheduleError(schedule)).toBe(server.scheduleError(schedule));
    },
  );
  it("shares the defaults", () => {
    expect(Q.DEFAULT_SCHEDULE).toEqual(server.DEFAULT_SCHEDULE);
    expect(Q.DEFAULT_TERMS).toBe(server.DEFAULT_TERMS);
  });
});

describe("money input", () => {
  it.each([
    ["1,234.5", 123450],
    ["0.05", 5],
    ["100", 10000],
    ["12.345", null],
    ["12,34", null],
    ["abc", null],
    ["", null],
  ])("toMinor(%j) → %j", (input, out) => expect(Q.toMinor(input)).toBe(out));
  it("formats and converts back", () => {
    expect(Q.formatMinor(123456, "GHS")).toBe("GHS 1,234.56");
    expect(Q.fromMinor(123450)).toBe("1234.50");
  });
  it("makes ids the server accepts", () => {
    expect(Q.newId("stage")).toMatch(/^[a-z0-9-]{1,24}$/);
  });
});

describe("formatDate", () => {
  it("formats in Accra time and survives bad input", () => {
    expect(Q.formatDate("2026-01-05T23:30:00Z")).toBe("5 Jan 2026");
    expect(Q.formatDate("not a date")).toBe("");
    expect(Q.formatDate(null)).toBe("");
  });
});

describe("quoteToDraft", () => {
  it("falls back to defaults for null, missing and empty values", () => {
    const d = Q.quoteToDraft({
      title: null as unknown as string,
      items: [],
      schedule: [],
      terms: null,
    });
    expect(d).toMatchObject({
      currency: "GHS",
      validDays: 14,
      terms: Q.DEFAULT_TERMS,
      discountMinor: 0,
      clientPhone: "",
      inquiryId: null,
      title: "",
    });
    expect(d.schedule).toEqual(Q.DEFAULT_SCHEDULE);
    expect(d.items).toHaveLength(1);
    expect(d.items[0]).toMatchObject({ description: "", qty: 1, unitMinor: 0 });
    expect(Q.quoteToDraft(null).items).toHaveLength(1);
  });
  it("keeps real values and copies arrays", () => {
    const q: Partial<AdminQuote> = {
      currency: "USD",
      validDays: 30,
      discountMinor: 500,
      inquiryId: "inq1",
      items: [{ id: "a", description: "A", qty: 2, unitMinor: 100 }],
      schedule: [{ id: "all", label: "All", percent: 100 }],
    };
    const d = Q.quoteToDraft(q);
    expect(d).toMatchObject({
      currency: "USD",
      validDays: 30,
      discountMinor: 500,
      inquiryId: "inq1",
    });
    expect(d.items).toEqual(q.items);
    expect(d.items).not.toBe(q.items);
    expect(d.items[0]).not.toBe(q.items![0]);
    expect(d.schedule).not.toBe(q.schedule);
    expect(Q.quoteToDraft(null).schedule).not.toBe(Q.DEFAULT_SCHEDULE);
  });
});
